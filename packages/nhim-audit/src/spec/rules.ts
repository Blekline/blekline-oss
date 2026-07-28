import type { Severity } from "../types.js";

export interface RuleSpec {
  id: string;
  severity: Severity;
  title: string;
  asi: string[];
  description: string;
}

/** NHIM-001..012 static rule catalog (v1). */
export const RULE_SPECS: RuleSpec[] = [
  {
    id: "NHIM-001",
    severity: "CRITICAL",
    title: "Agent candidate — no blekline-sidecar or inject annotation",
    asi: ["ASI02", "ASI10"],
    description: "Candidate workload lacks sidecar container and inject annotation.",
  },
  {
    id: "NHIM-002",
    severity: "CRITICAL",
    title: "Mandatory-hop NetworkPolicy missing",
    asi: ["ASI10"],
    description: "Agent namespace allows direct egress without sidecar hop restriction.",
  },
  {
    id: "NHIM-003",
    severity: "HIGH",
    title: "Blekline admission webhook not installed",
    asi: ["ASI08"],
    description: "Agent candidates exist but no Blekline mutating admission webhook detected.",
  },
  {
    id: "NHIM-004",
    severity: "HIGH",
    title: "Admission webhook failurePolicy Ignore",
    asi: ["ASI08"],
    description: "Mutating webhook fails open when unavailable.",
  },
  {
    id: "NHIM-005",
    severity: "HIGH",
    title: "Sidecar Service exposed externally",
    asi: ["ASI03"],
    description: "Sidecar service uses LoadBalancer or NodePort on enforcement port.",
  },
  {
    id: "NHIM-006",
    severity: "MEDIUM",
    title: "LLM env without sidecar path",
    asi: ["ASI02"],
    description: "Agent candidate env suggests public LLM endpoint without sidecar in pod path.",
  },
  {
    id: "NHIM-007",
    severity: "MEDIUM",
    title: "blekline-sidecar-auth secret missing",
    asi: ["ASI03"],
    description: "Namespace with sidecar lacks sidecar auth secret.",
  },
  {
    id: "NHIM-008",
    severity: "MEDIUM",
    title: "Agent namespace policy gap",
    asi: ["ASI10"],
    description: "No Gatekeeper or policy protecting blekline-agent namespace pattern.",
  },
  {
    id: "NHIM-009",
    severity: "LOW",
    title: "Blekline Helm release absent",
    asi: [],
    description: "Agent candidates present but no Blekline Helm release detected.",
  },
  {
    id: "NHIM-010",
    severity: "INFO",
    title: "Sidecar health not verified",
    asi: ["ASI08"],
    description: "Sidecar found but health endpoint not checked in static mode.",
  },
  {
    id: "NHIM-011",
    severity: "MEDIUM",
    title: "Default-allow egress shared by agent candidates",
    asi: ["ASI10"],
    description: "Multiple agent candidates in namespaces without restrictive NetworkPolicy.",
  },
  {
    id: "NHIM-012",
    severity: "INFO",
    title: "Shared responsibility reminder",
    asi: [],
    description: "Customer retains model-layer and organizational control responsibilities.",
  },
];

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  CRITICAL: 15,
  HIGH: 10,
  MEDIUM: 5,
  LOW: 2,
  INFO: 0,
};
