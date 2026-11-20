import type { AuditProfileName, Severity } from "../types.js";

export interface RuleSpec {
  id: string;
  severity: Severity;
  title: string;
  asi: string[];
  description: string;
  profiles?: AuditProfileName[];
}

/** POSTURE static rule catalog (v2.0); legacy NHIM-* ids map on import. */
export const RULE_SPECS: RuleSpec[] = [
  {
    id: "POSTURE-001",
    severity: "CRITICAL",
    title: "Agent candidate — no enforcement sidecar or inject annotation",
    asi: ["ASI02", "ASI10"],
    description: "Candidate workload lacks sidecar container and inject annotation.",
  },
  {
    id: "POSTURE-002",
    severity: "CRITICAL",
    title: "Agent namespace — no mandatory-hop egress policy",
    asi: ["ASI10"],
    description: "Agent namespace allows direct egress without sidecar hop restriction.",
  },
  {
    id: "POSTURE-003",
    severity: "HIGH",
    title: "Mutating admission for workload injection not detected",
    asi: ["ASI08"],
    description: "Agent candidates exist but no enforcement mutating admission webhook detected.",
  },
  {
    id: "POSTURE-004",
    severity: "HIGH",
    title: "Enforcement webhook fail-open (failurePolicy: Ignore)",
    asi: ["ASI08"],
    description: "Mutating webhook fails open when unavailable.",
  },
  {
    id: "POSTURE-005",
    severity: "HIGH",
    title: "Enforcement plane externally exposed",
    asi: ["ASI03"],
    description: "Enforcement service uses LoadBalancer or NodePort on enforcement port.",
  },
  {
    id: "POSTURE-006",
    severity: "MEDIUM",
    title: "LLM API credentials without enforcement hop path",
    asi: ["ASI02"],
    description: "Agent candidate env suggests public LLM endpoint without sidecar in pod path.",
  },
  {
    id: "POSTURE-007",
    severity: "MEDIUM",
    title: "Enforcement auth secret missing in agent namespace",
    asi: ["ASI03"],
    description: "Namespace with sidecar lacks enforcement auth secret.",
  },
  {
    id: "POSTURE-008",
    severity: "MEDIUM",
    title: "Policy engine not detected for agent namespaces",
    asi: ["ASI10"],
    description: "No Gatekeeper, Kyverno, or ValidatingAdmissionPolicy detected.",
  },
  {
    id: "POSTURE-011",
    severity: "MEDIUM",
    title: "Default-allow egress shared by agent candidates",
    asi: ["ASI10"],
    description: "Multiple agent candidates in namespaces without restrictive NetworkPolicy.",
  },
  {
    id: "POSTURE-012",
    severity: "INFO",
    title: "Shared responsibility reminder",
    asi: [],
    description: "Customer retains model-layer and organizational control responsibilities.",
  },
  {
    id: "POSTURE-013",
    severity: "MEDIUM",
    title: "No agent candidates discovered",
    asi: ["ASI10"],
    description: "Static scan incomplete — deploy workloads or widen discovery.",
  },
  {
    id: "POSTURE-014",
    severity: "CRITICAL",
    title: "NetworkPolicy allows wide HTTPS egress (0.0.0.0/0:443 bypass)",
    asi: ["ASI10"],
    description: "Wide HTTPS egress bypasses mandatory-hop enforcement.",
  },
  {
    id: "POSTURE-015",
    severity: "MEDIUM",
    title: "Sidecar inject enabled but auto-route disabled",
    asi: ["ASI02"],
    description: "Inject annotation present but auto-route explicitly disabled.",
  },
  {
    id: "POSTURE-016",
    severity: "MEDIUM",
    title: "LLM config via envFrom only — enforcement path not verifiable",
    asi: ["ASI02"],
    description: "LLM credentials loaded via envFrom without verifiable sidecar path.",
  },
  {
    id: "POSTURE-017",
    severity: "MEDIUM",
    title: "Enforcement sidecar present but LLM upstream path env missing",
    asi: ["ASI02"],
    description: "Sidecar present but SDK base URL env not pointed at enforcement listener.",
  },
  {
    id: "POSTURE-018",
    severity: "HIGH",
    title: "iptables auto-route requested without injected enforcement sidecar",
    asi: ["ASI10"],
    description: "iptables auto-route annotation without injected sidecar container.",
  },
  {
    id: "POSTURE-019",
    severity: "CRITICAL",
    title: "Agent candidate uses hostNetwork — NetworkPolicy bypass",
    asi: ["ASI10"],
    description: "hostNetwork: true bypasses namespace NetworkPolicy enforcement.",
  },
  {
    id: "POSTURE-023",
    severity: "INFO",
    title: "Istio/mesh detected — K8s NetworkPolicy hop not verified",
    asi: ["ASI10"],
    description: "Service mesh may enforce hop — verify AuthorizationPolicy separately.",
  },
  {
    id: "BLEK-001",
    severity: "LOW",
    title: "Blekline Helm release absent",
    asi: [],
    description: "Agent candidates present but no Blekline Helm release detected.",
    profiles: ["blekline"],
  },
  {
    id: "BLEK-002",
    severity: "INFO",
    title: "Blekline sidecar health not verified in static mode",
    asi: ["ASI08"],
    description: "Sidecar found but health endpoint not checked in static mode.",
    profiles: ["blekline"],
  },
  {
    id: "BLEK-003",
    severity: "HIGH",
    title: "Blekline admission webhook not installed",
    asi: ["ASI08"],
    description: "No Blekline mutating admission webhook detected.",
    profiles: ["blekline"],
  },
  {
    id: "BLEK-004",
    severity: "MEDIUM",
    title: "Blekline Auto-Route misconfiguration",
    asi: ["ASI02", "ASI10"],
    description: "Blekline auto-route annotation disabled or iptables without sidecar.",
    profiles: ["blekline"],
  },
  {
    id: "BLEK-005",
    severity: "INFO",
    title: "Blekline pilot image pin reference",
    asi: [],
    description: "Pin sidecar image by digest; verify cosign in CI.",
    profiles: ["blekline"],
  },
];

export function rulesForProfile(profile: AuditProfileName): RuleSpec[] {
  return RULE_SPECS.filter((r) => !r.profiles || r.profiles.includes(profile));
}

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  CRITICAL: 15,
  HIGH: 10,
  MEDIUM: 5,
  LOW: 2,
  INFO: 0,
};

export const DOCS_RULE_BASE = "https://app.blekline.com/docs/operate/security";
