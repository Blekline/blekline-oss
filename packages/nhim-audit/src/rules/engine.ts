import type { Finding, Severity } from "../types.js";
import { STATIC_SUBTITLE, DOCS_BASE, OSS_HELM_BASE } from "../types.js";
import {
  discoverAgents,
  hasInjectAnnotation,
  hasSidecar,
  type DiscoverOptions,
} from "../discover/agents.js";
import type { ClusterSnapshot, AgentCandidate } from "../types.js";

function staticSubtitle(severity: Severity): string | undefined {
  if (severity === "CRITICAL" || severity === "HIGH") return STATIC_SUBTITLE;
  return undefined;
}

function mkFinding(
  partial: Omit<Finding, "static" | "evidence"> & { static?: boolean; evidence?: Finding["evidence"] },
): Finding {
  const severity = partial.severity;
  return {
    ...partial,
    static: partial.static ?? true,
    evidence: partial.evidence ?? "static",
    subtitle: partial.subtitle ?? staticSubtitle(severity),
  };
}

export function runStaticRules(
  cluster: ClusterSnapshot,
  discoverOpts: DiscoverOptions,
): { candidates: AgentCandidate[]; findings: Finding[] } {
  const candidates = discoverAgents(cluster, discoverOpts).filter(
    (c) => !["kube-system", "kube-public"].includes(c.namespace),
  );
  const findings: Finding[] = [];

  for (const c of candidates) {
    if (!hasSidecar(c) && !hasInjectAnnotation(c)) {
      findings.push(
        mkFinding({
          id: "NHIM-001",
          severity: "CRITICAL",
          title: "Agent candidate — no blekline-sidecar or inject annotation",
          resource: `${c.namespace}/${c.kind}/${c.name}`,
          namespace: c.namespace,
          asi: ["ASI02", "ASI10"],
          discovery: { signals: c.signals, confidence: c.confidence },
          fix: {
            summary: "Enable sidecar injection on the candidate workload",
            commands: [
              `kubectl -n ${c.namespace} annotate ${c.kind.toLowerCase()}/${c.name} blekline.com/inject-sidecar=enabled --overwrite`,
            ],
            docUrl: `${DOCS_BASE}/enterprise/k8s-deployment`,
          },
        }),
      );
    }
  }

  const agentNamespaces = [...new Set(candidates.map((c) => c.namespace))];
  for (const ns of agentNamespaces) {
    const nps = cluster.networkPolicies.filter((np) => np.namespace === ns);
    const hasHop = nps.some((np) => np.egressRestricted && np.allowsSidecarHop);
    if (!hasHop) {
      findings.push(
        mkFinding({
          id: "NHIM-002",
          severity: "CRITICAL",
          title: "Mandatory-hop NetworkPolicy missing",
          resource: `${ns}/NetworkPolicy`,
          namespace: ns,
          asi: ["ASI10"],
          fix: {
            summary: "Apply agent egress deny NetworkPolicy",
            commands: [
              `helm upgrade blekline ${OSS_HELM_BASE} --set networkPolicy.agentEgressDeny.enabled=true -n ${ns}`,
            ],
            docUrl: `${DOCS_BASE}/enterprise/k8s-deployment`,
          },
        }),
      );
    }
  }

  if (candidates.length > 0) {
    const bleklineWh = cluster.mutatingWebhooks.find((w) => w.matchesBlekline);
    if (!bleklineWh) {
      findings.push(
        mkFinding({
          id: "NHIM-003",
          severity: "HIGH",
          title: "Blekline admission webhook not installed",
          resource: "cluster/MutatingWebhookConfiguration",
          namespace: "*",
          asi: ["ASI08"],
          fix: {
            summary: "Install Blekline mutating admission webhook",
            commands: ["# See app.blekline.com/docs/enterprise/k8s-deployment"],
            docUrl: `${DOCS_BASE}/enterprise/k8s-deployment`,
          },
        }),
      );
    } else if (bleklineWh.failurePolicy === "Ignore") {
      findings.push(
        mkFinding({
          id: "NHIM-004",
          severity: "HIGH",
          title: "Admission webhook failurePolicy Ignore",
          resource: `cluster/MutatingWebhookConfiguration/${bleklineWh.name}`,
          namespace: "*",
          asi: ["ASI08"],
          fix: {
            summary: "Set admission webhook failurePolicy to Fail",
            commands: [`# Set failurePolicy: Fail on ${bleklineWh.name}`],
            docUrl: `${DOCS_BASE}/enterprise/k8s-deployment`,
          },
        }),
      );
    }
  }

  for (const svc of cluster.services) {
    if (
      (svc.type === "LoadBalancer" || svc.type === "NodePort") &&
      svc.ports.includes(8787)
    ) {
      findings.push(
        mkFinding({
          id: "NHIM-005",
          severity: "HIGH",
          title: "Sidecar Service exposed externally",
          resource: `${svc.namespace}/Service/${svc.name}`,
          namespace: svc.namespace,
          asi: ["ASI03"],
          fix: {
            summary: "Use ClusterIP for sidecar service",
            commands: [`kubectl -n ${svc.namespace} patch svc ${svc.name} -p '{"spec":{"type":"ClusterIP"}}'`],
            docUrl: `${DOCS_BASE}/enterprise/k8s-deployment`,
          },
        }),
      );
    }
  }

  for (const c of candidates) {
    const llmEnv = c.envKeys.some(
      (e) =>
        e.includes("OPENAI") ||
        e.includes("ANTHROPIC") ||
        e.includes("AZURE_OPENAI"),
    );
    if (llmEnv && !hasSidecar(c) && !c.envKeys.some((e) => e.includes("BLEKLINE_SIDECAR"))) {
      findings.push(
        mkFinding({
          id: "NHIM-006",
          severity: "MEDIUM",
          title: "LLM env without sidecar path",
          resource: `${c.namespace}/${c.kind}/${c.name}`,
          namespace: c.namespace,
          asi: ["ASI02"],
          discovery: { signals: c.signals, confidence: c.confidence },
          fix: {
            summary: "Route LLM calls through blekline-sidecar",
            commands: [`# Inject sidecar and set BLEKLINE_SIDECAR_URL on ${c.name}`],
            docUrl: `${DOCS_BASE}/enterprise/k8s-deployment`,
          },
        }),
      );
    }
  }

  const sidecarNamespaces = new Set(
    candidates.filter((c) => hasSidecar(c)).map((c) => c.namespace),
  );
  for (const ns of sidecarNamespaces) {
    const hasAuth = cluster.secrets.some(
      (s) => s.namespace === ns && s.name === "blekline-sidecar-auth",
    );
    if (!hasAuth) {
      findings.push(
        mkFinding({
          id: "NHIM-007",
          severity: "MEDIUM",
          title: "blekline-sidecar-auth secret missing",
          resource: `${ns}/Secret/blekline-sidecar-auth`,
          namespace: ns,
          asi: ["ASI03"],
          fix: {
            summary: "Create blekline-sidecar-auth secret in namespace",
            commands: [`kubectl -n ${ns} create secret generic blekline-sidecar-auth --from-literal=token=REPLACE_ME`],
            docUrl: `${DOCS_BASE}/enterprise/trust-vault-sidecar`,
          },
        }),
      );
    }
  }

  for (const ns of agentNamespaces) {
    if (ns.startsWith("blekline-agent") && !cluster.hasGatekeeper) {
      findings.push(
        mkFinding({
          id: "NHIM-008",
          severity: "MEDIUM",
          title: "Agent namespace policy gap",
          resource: `${ns}/Policy`,
          namespace: ns,
          asi: ["ASI10"],
          fix: {
            summary: "Apply Gatekeeper or OPA policy requiring sidecar",
            commands: ["# See Blekline K8s deployment docs for gatekeeper example"],
            docUrl: `${DOCS_BASE}/enterprise/k8s-deployment`,
          },
        }),
      );
    }
  }

  if (candidates.length > 0 && !cluster.hasBleklineHelm) {
    findings.push(
      mkFinding({
        id: "NHIM-009",
        severity: "LOW",
        title: "Blekline Helm release absent",
        resource: "cluster/HelmRelease",
        namespace: "*",
        asi: [],
        fix: {
          summary: "Install Blekline ingress Helm chart",
          commands: [`helm install blekline ${OSS_HELM_BASE}`],
          docUrl: `${DOCS_BASE}/enterprise/k8s-deployment`,
        },
      }),
    );
  }

  if (cluster.services.some((s) => s.ports.includes(8787))) {
    findings.push(
      mkFinding({
        id: "NHIM-010",
        severity: "INFO",
        title: "Sidecar health not verified in static mode",
        resource: "cluster/blekline-sidecar",
        namespace: "blekline",
        asi: ["ASI08"],
        subtitle: "Run --probe with eval token to verify /health",
        fix: {
          summary: "Verify sidecar health with probe mode",
          commands: ["BLEKLINE_EVAL_TOKEN=blw_eval_… nhim-audit audit --probe"],
          docUrl: `${DOCS_BASE}/tools/nhim-audit#probe-access`,
        },
      }),
    );
  }

  const unprotected = agentNamespaces.filter((ns) => {
    const nps = cluster.networkPolicies.filter((np) => np.namespace === ns);
    return nps.length === 0 || !nps.some((np) => np.egressRestricted);
  });
  if (unprotected.length >= 2) {
    findings.push(
      mkFinding({
        id: "NHIM-011",
        severity: "MEDIUM",
        title: "Default-allow egress shared by agent candidates",
        resource: `cluster/namespaces/${unprotected.join(",")}`,
        namespace: unprotected[0] ?? "*",
        asi: ["ASI10"],
        fix: {
          summary: "Apply namespace-scoped egress deny policies",
          commands: unprotected.map(
            (ns) => `# Apply agent NetworkPolicy in ${ns}`,
          ),
          docUrl: `${DOCS_BASE}/enterprise/k8s-deployment`,
        },
      }),
    );
  }

  findings.push(
    mkFinding({
      id: "NHIM-012",
      severity: "INFO",
      title: "Shared responsibility reminder",
      resource: "cluster/policy",
      namespace: "*",
      asi: [],
      subtitle: "Model-layer risks (OWASP LLM Top 10) remain customer responsibility",
      fix: {
        summary: "Review shared responsibility matrix with security team",
        commands: [],
        docUrl: `${DOCS_BASE}/enterprise/compliance-evidence`,
      },
    }),
  );

  return { candidates, findings: dedupeFindings(findings) };
}

function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.id}:${f.resource}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
