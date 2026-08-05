import type { AuditConfig } from "../config/profile.js";
import type { AgentCandidate, ClusterSnapshot, Finding } from "../types.js";
import { DOCS_BASE, OSS_HELM_CHART, PILOT_SIDECAR_IMAGE } from "../types.js";
import { hasEnforcementSidecar } from "../discover/agents.js";
import { mkFinding } from "./helpers.js";

export function runBleklineRules(
  cluster: ClusterSnapshot,
  config: AuditConfig,
  candidates: AgentCandidate[],
): Finding[] {
  if (config.profile !== "blekline") return [];
  const findings: Finding[] = [];

  const bleklineWh = cluster.mutatingWebhooks.find((w) => w.matchesBlekline);
  if (candidates.length > 0 && !bleklineWh) {
    findings.push(
      mkFinding({
        id: "BLEK-003",
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
  }

  if (candidates.length > 0 && !cluster.hasBleklineHelm) {
    findings.push(
      mkFinding({
        id: "BLEK-001",
        severity: "LOW",
        title: "Blekline Helm release absent",
        resource: "cluster/HelmRelease",
        namespace: "*",
        asi: [],
        fix: {
          summary: "Install Blekline ingress Helm chart",
          commands: [
            `helm upgrade --install sidecar ${OSS_HELM_CHART} -n blekline --create-namespace`,
            `# Image: ${PILOT_SIDECAR_IMAGE}`,
          ],
          docUrl: `${DOCS_BASE}/enterprise/k8s-deployment`,
        },
      }),
    );
  }

  if (cluster.services.some((s) => s.ports.includes(8787))) {
    findings.push(
      mkFinding({
        id: "BLEK-002",
        severity: "INFO",
        title: "Blekline sidecar health not verified in static mode",
        resource: "cluster/blekline-sidecar",
        namespace: "blekline",
        asi: ["ASI08"],
        subtitle: "Run --probe with eval token to verify /health",
        fix: {
          summary: "Verify Blekline sidecar health with probe mode",
          commands: ["NHIM_PROBE_TOKEN=blw_eval_… nhim-audit audit --probe"],
          docUrl: `${DOCS_BASE}/tools/nhim-audit#probe-access`,
        },
      }),
    );
  }

  for (const c of candidates) {
    const autoRoute = c.annotations["blekline.com/auto-route"];
    if (autoRoute === "disabled" || autoRoute === "false") {
      findings.push(
        mkFinding({
          id: "BLEK-004",
          severity: "MEDIUM",
          title: "Blekline Auto-Route explicitly disabled",
          resource: `${c.namespace}/${c.kind}/${c.name}`,
          namespace: c.namespace,
          asi: ["ASI02"],
          fix: {
            summary: "Remove blekline.com/auto-route=disabled or document SDK bypass",
            commands: [
              `kubectl -n ${c.namespace} annotate ${c.kind.toLowerCase()}/${c.name} blekline.com/auto-route-`,
            ],
            docUrl: `${DOCS_BASE}/enterprise/k8s-deployment`,
          },
        }),
      );
    }
    if (c.annotations["blekline.com/auto-route"] === "iptables" && !hasEnforcementSidecar(c, config)) {
      findings.push(
        mkFinding({
          id: "BLEK-004",
          severity: "HIGH",
          title: "Blekline iptables Auto-Route without blekline-sidecar",
          resource: `${c.namespace}/${c.kind}/${c.name}`,
          namespace: c.namespace,
          asi: ["ASI10"],
          fix: {
            summary: "Enable blekline.com/inject-sidecar when using iptables auto-route",
            commands: [],
            docUrl: `${DOCS_BASE}/enterprise/k8s-deployment`,
          },
        }),
      );
    }
  }

  findings.push(
    mkFinding({
      id: "BLEK-005",
      severity: "INFO",
      title: "Blekline pilot image pin reference",
      resource: "cluster/ghcr.io/blekline/sidecar",
      namespace: "*",
      asi: [],
      subtitle: `Pin ${PILOT_SIDECAR_IMAGE} and verify cosign signature in production`,
      fix: {
        summary: "Pin sidecar image by digest; verify cosign in CI",
        commands: [`# Image: ${PILOT_SIDECAR_IMAGE}`],
        docUrl: `${DOCS_BASE}/enterprise/k8s-deployment`,
      },
    }),
  );

  return findings;
}
