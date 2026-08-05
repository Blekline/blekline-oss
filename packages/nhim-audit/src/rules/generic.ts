import type { AuditConfig } from "../config/profile.js";
import { matchesNpName, matchesSecretName } from "../config/match.js";
import {
  discoverAgents,
  hasAutoRouteDisabled,
  hasAutoRouteIptables,
  hasEnforcementSidecar,
  hasInjectAnnotation,
  hasLlmEnv,
  hasSidecarPathEnv,
  type DiscoverOptions,
} from "../discover/agents.js";
import type { AgentCandidate, ClusterSnapshot, Finding } from "../types.js";
import { DOCS_BASE, OSS_HELM_CHART, PILOT_SIDECAR_IMAGE } from "../types.js";
import { GENERIC_DOCS, mkFinding } from "./helpers.js";

function npHasHop(
  cluster: ClusterSnapshot,
  ns: string,
  config: AuditConfig,
): boolean {
  return cluster.networkPolicies.some(
    (np) =>
      np.namespace === ns &&
      np.egressRestricted &&
      np.allowsSidecarHop &&
      !np.allowsWideHttpsEgress,
  );
}

function enforcementWebhooks(cluster: ClusterSnapshot) {
  return cluster.mutatingWebhooks.filter((w) => w.matchesEnforcement);
}

export function runGenericRules(
  cluster: ClusterSnapshot,
  config: AuditConfig,
  discoverOpts: DiscoverOptions,
): { candidates: AgentCandidate[]; findings: Finding[] } {
  const findings: Finding[] = [];
  const candidates = discoverAgents(cluster, {
    ...discoverOpts,
    excludeNamespaces: config.discovery.excludeNamespaces,
  });

  for (const c of candidates) {
    if (c.hostNetwork) {
      findings.push(
        mkFinding({
          id: "NHIM-019",
          severity: "CRITICAL",
          title: "Agent candidate uses hostNetwork — NetworkPolicy bypass",
          resource: `${c.namespace}/${c.kind}/${c.name}`,
          namespace: c.namespace,
          asi: ["ASI10"],
          pentestScope: ["mandatory-hop"],
          discovery: { signals: c.signals, confidence: c.confidence },
          fix: {
            summary: "Remove hostNetwork; enforce mandatory hop via sidecar/mesh + NetworkPolicy",
            commands: [
              `# Patch ${c.kind}/${c.name} — set hostNetwork: false`,
              `# Apply mandatory-hop NetworkPolicy in ${c.namespace}`,
            ],
            docUrl: `${DOCS_BASE}/enterprise/k8s-deployment`,
          },
        }),
      );
    }
  }

  for (const c of candidates) {
    if (!hasEnforcementSidecar(c, config) && !hasInjectAnnotation(c, config)) {
      findings.push(
        mkFinding({
          id: "NHIM-001",
          severity: "CRITICAL",
          title: "Agent candidate — no enforcement sidecar or inject annotation",
          resource: `${c.namespace}/${c.kind}/${c.name}`,
          namespace: c.namespace,
          asi: ["ASI02", "ASI10"],
          discovery: { signals: c.signals, confidence: c.confidence },
          fix: {
            summary: "Enable enforcement sidecar injection on the candidate workload",
            commands: [
              `# Annotate workload for sidecar inject or add mesh/sidecar container`,
              `# See mandatory-hop NetworkPolicy examples in NHIM audit docs`,
            ],
            docUrl: GENERIC_DOCS,
            vendorHints:
              config.profile === "blekline"
                ? [
                    {
                      vendor: "blekline",
                      commands: [
                        `kubectl -n ${c.namespace} annotate ${c.kind.toLowerCase()}/${c.name} blekline.com/inject-sidecar=enabled --overwrite`,
                      ],
                      docUrl: `${DOCS_BASE}/enterprise/k8s-deployment`,
                    },
                  ]
                : undefined,
          },
        }),
      );
    }
  }

  const agentNamespaces = [...new Set(candidates.map((c) => c.namespace))];
  for (const ns of agentNamespaces) {
    const nps = cluster.networkPolicies.filter((np) => np.namespace === ns);
    const wideHttps = nps.some((np) => np.allowsWideHttpsEgress);
    const hasHop = npHasHop(cluster, ns, config);
    if (wideHttps) {
      findings.push(
        mkFinding({
          id: "NHIM-014",
          severity: "CRITICAL",
          title: "NetworkPolicy allows wide HTTPS egress (0.0.0.0/0:443 bypass)",
          resource: `${ns}/NetworkPolicy`,
          namespace: ns,
          asi: ["ASI10"],
          pentestScope: ["mandatory-hop"],
          fix: {
            summary: "Remove wide HTTPS egress; route LLM traffic via enforcement mandatory hop",
            commands: [
              `# Remove 0.0.0.0/0:443 from egress in ${ns}`,
              `# Apply mandatory-hop NetworkPolicy — agent egress via sidecar/mesh only`,
            ],
            docUrl: GENERIC_DOCS,
          },
        }),
      );
    }
    if (!hasHop && !wideHttps) {
      findings.push(
        mkFinding({
          id: "NHIM-002",
          severity: "CRITICAL",
          title: "Agent namespace — no mandatory-hop egress policy",
          resource: `${ns}/NetworkPolicy`,
          namespace: ns,
          asi: ["ASI10"],
          pentestScope: ["mandatory-hop"],
          fix: {
            summary: "Apply mandatory-hop NetworkPolicy (agent egress via enforcement plane only)",
            commands: [
              `# kubectl apply -f mandatory-hop-networkpolicy.yaml -n ${ns}`,
              `# Reference: CIS Kubernetes Benchmark — restrict pod egress`,
            ],
            docUrl: GENERIC_DOCS,
            vendorHints:
              config.profile === "blekline"
                ? [
                    {
                      vendor: "blekline",
                      commands: [
                        `helm upgrade --install sidecar ${OSS_HELM_CHART} -n blekline --create-namespace --set networkPolicy.agentEgressDeny.enabled=true`,
                      ],
                      docUrl: `${DOCS_BASE}/enterprise/k8s-deployment`,
                    },
                  ]
                : undefined,
          },
        }),
      );
    }
  }

  if (candidates.length > 0) {
    const hooks = enforcementWebhooks(cluster);
    if (hooks.length === 0) {
      findings.push(
        mkFinding({
          id: "NHIM-003",
          severity: "HIGH",
          title: "Mutating admission for workload injection not detected",
          resource: "cluster/MutatingWebhookConfiguration",
          namespace: "*",
          asi: ["ASI08"],
          pentestScope: ["admission"],
          fix: {
            summary: "Install mutating admission webhook for opt-in sidecar injection",
            commands: ["# Install enforcement mutating webhook per your platform standard"],
            docUrl: GENERIC_DOCS,
          },
        }),
      );
    } else {
      for (const wh of hooks.filter((w) => w.failurePolicy === "Ignore")) {
        findings.push(
          mkFinding({
            id: "NHIM-004",
            severity: "HIGH",
            title: "Enforcement webhook fail-open (failurePolicy: Ignore)",
            resource: `cluster/MutatingWebhookConfiguration/${wh.name}`,
            namespace: "*",
            asi: ["ASI08"],
            pentestScope: ["admission"],
            fix: {
              summary: "Set enforcement webhook failurePolicy to Fail for fail-closed scheduling",
              commands: [`# Set failurePolicy: Fail on ${wh.name}`],
              docUrl: GENERIC_DOCS,
            },
          }),
        );
      }
    }
  }

  for (const svc of cluster.services) {
    if (
      (svc.type === "LoadBalancer" || svc.type === "NodePort") &&
      config.enforcement.enforcementPorts.some((p) => svc.ports.includes(p))
    ) {
      findings.push(
        mkFinding({
          id: "NHIM-005",
          severity: "HIGH",
          title: "Enforcement plane externally exposed",
          resource: `${svc.namespace}/Service/${svc.name}`,
          namespace: svc.namespace,
          asi: ["ASI03"],
          fix: {
            summary: "Use ClusterIP for enforcement sidecar/mesh service",
            commands: [`kubectl -n ${svc.namespace} patch svc ${svc.name} -p '{"spec":{"type":"ClusterIP"}}'`],
            docUrl: GENERIC_DOCS,
          },
        }),
      );
    }
  }

  for (const c of candidates) {
    if (hasLlmEnv(c, config) && !hasEnforcementSidecar(c, config) && !hasSidecarPathEnv(c, config)) {
      findings.push(
        mkFinding({
          id: "NHIM-006",
          severity: "MEDIUM",
          title: "LLM API credentials without enforcement hop path",
          resource: `${c.namespace}/${c.kind}/${c.name}`,
          namespace: c.namespace,
          asi: ["ASI02"],
          discovery: { signals: c.signals, confidence: c.confidence },
          fix: {
            summary: "Route LLM SDK traffic through enforcement sidecar or mesh",
            commands: [`# Set OPENAI_BASE_URL / ANTHROPIC_BASE_URL to local sidecar or mesh listener`],
            docUrl: GENERIC_DOCS,
          },
        }),
      );
    }
  }

  const sidecarNamespaces = new Set(
    candidates.filter((c) => hasEnforcementSidecar(c, config)).map((c) => c.namespace),
  );
  for (const ns of sidecarNamespaces) {
    const hasAuth = cluster.secrets.some(
      (s) =>
        s.namespace === ns &&
        matchesSecretName(config.enforcement.authSecretNamePatterns, s.name),
    );
    if (!hasAuth) {
      findings.push(
        mkFinding({
          id: "NHIM-007",
          severity: "MEDIUM",
          title: "Enforcement auth secret missing in agent namespace",
          resource: `${ns}/Secret/*-sidecar-auth`,
          namespace: ns,
          asi: ["ASI03"],
          fix: {
            summary: "Create enforcement auth secret for sidecar enforce API",
            commands: [`kubectl -n ${ns} create secret generic enforcement-sidecar-auth --from-literal=token=REPLACE_ME`],
            docUrl: GENERIC_DOCS,
          },
        }),
      );
    }
  }

  if (
    candidates.length > 0 &&
    !cluster.hasGatekeeper &&
    !cluster.hasKyverno &&
    cluster.validatingWebhooks.length === 0
  ) {
    findings.push(
      mkFinding({
        id: "NHIM-008",
        severity: "MEDIUM",
        title: "Policy engine not detected for agent namespaces",
        resource: "cluster/PolicyEngine",
        namespace: "*",
        asi: ["ASI10"],
        fix: {
          summary: "Deploy Gatekeeper, Kyverno, or ValidatingAdmissionPolicy for agent namespaces",
          commands: ["# Install OPA Gatekeeper or Kyverno cluster policy engine"],
          docUrl: GENERIC_DOCS,
        },
      }),
    );
  }

  if (cluster.hasIstioAuthPolicy && agentNamespaces.length > 0) {
    const withoutNpHop = agentNamespaces.filter((ns) => !npHasHop(cluster, ns, config));
    if (withoutNpHop.length > 0) {
      findings.push(
        mkFinding({
          id: "NHIM-023",
          severity: "INFO",
          title: "Istio/mesh detected — K8s NetworkPolicy hop not verified",
          resource: `cluster/namespaces/${withoutNpHop.join(",")}`,
          namespace: withoutNpHop[0] ?? "*",
          asi: ["ASI10"],
          subtitle: "Mesh may enforce hop — verify AuthorizationPolicy separately",
          fix: {
            summary: "Confirm Istio AuthorizationPolicy enforces mandatory hop for agent candidates",
            commands: [],
            docUrl: GENERIC_DOCS,
          },
        }),
      );
    }
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
          commands: unprotected.map((ns) => `# Apply agent NetworkPolicy in ${ns}`),
          docUrl: GENERIC_DOCS,
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

  for (const c of candidates) {
    if (hasInjectAnnotation(c, config) && hasAutoRouteDisabled(c, config)) {
      findings.push(
        mkFinding({
          id: "NHIM-015",
          severity: "MEDIUM",
          title: "Sidecar inject enabled but auto-route disabled",
          resource: `${c.namespace}/${c.kind}/${c.name}`,
          namespace: c.namespace,
          asi: ["ASI02"],
          fix: {
            summary: "Remove auto-route disabled annotation or document intentional SDK bypass",
            commands: [`# Review inject annotation and routing config on ${c.name}`],
            docUrl: GENERIC_DOCS,
          },
        }),
      );
    }
  }

  for (const c of candidates) {
    const hasDirectLlmEnv = hasSidecarPathEnv(c, config);
    if (c.usesEnvFrom && !hasDirectLlmEnv && !hasEnforcementSidecar(c, config)) {
      findings.push(
        mkFinding({
          id: "NHIM-016",
          severity: "MEDIUM",
          title: "LLM config via envFrom only — enforcement path not verifiable",
          resource: `${c.namespace}/${c.kind}/${c.name}`,
          namespace: c.namespace,
          asi: ["ASI02"],
          fix: {
            summary: "Set explicit SDK base URL env on container or use inject-sidecar with auto-route",
            commands: [],
            docUrl: GENERIC_DOCS,
          },
        }),
      );
    }
  }

  for (const c of candidates) {
    if (
      hasEnforcementSidecar(c, config) &&
      hasLlmEnv(c, config) &&
      !hasSidecarPathEnv(c, config)
    ) {
      findings.push(
        mkFinding({
          id: "NHIM-017",
          severity: "MEDIUM",
          title: "Enforcement sidecar present but LLM upstream path env missing",
          resource: `${c.namespace}/${c.kind}/${c.name}`,
          namespace: c.namespace,
          asi: ["ASI02"],
          fix: {
            summary: "Configure OPENAI_API_BASE / ANTHROPIC_BASE_URL to local enforcement listener",
            commands: [],
            docUrl: GENERIC_DOCS,
          },
        }),
      );
    }
  }

  for (const c of candidates) {
    if (hasAutoRouteIptables(c, config) && !hasEnforcementSidecar(c, config)) {
      findings.push(
        mkFinding({
          id: "NHIM-018",
          severity: "HIGH",
          title: "iptables auto-route requested without injected enforcement sidecar",
          resource: `${c.namespace}/${c.kind}/${c.name}`,
          namespace: c.namespace,
          asi: ["ASI10"],
          fix: {
            summary: "Enable inject-sidecar when using iptables auto-route",
            commands: [],
            docUrl: GENERIC_DOCS,
          },
        }),
      );
    }
  }

  if (candidates.length === 0) {
    findings.push(
      mkFinding({
        id: "NHIM-013",
        severity: "MEDIUM",
        title: "No agent candidates discovered",
        resource: "cluster/workloads",
        namespace: "*",
        asi: ["ASI10"],
        subtitle: "Static scan incomplete — deploy workloads or widen discovery",
        fix: {
          summary: "Deploy agent workloads or pass --label-selector to discover candidates",
          commands: ["nhim-audit audit --label-selector app.kubernetes.io/component=agent"],
          docUrl: GENERIC_DOCS,
        },
      }),
    );
  }

  return { candidates, findings };
}

export function enrichNetworkPolicyHop(npName: string, config: AuditConfig): boolean {
  return matchesNpName(config.networkPolicy.mandatoryHopNamePatterns, npName);
}
