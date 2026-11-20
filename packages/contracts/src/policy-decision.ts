import type { EnforcementAction } from "./enforcement.js";
import type { GuardCheckActionWire } from "./execution-policy.js";

export type PolicySurface = "local" | "mark" | "sidecar" | "cluster";

export type PolicyDecisionLayer =
  | "applicability"
  | "emergency"
  | "session"
  | "managed_check"
  | "mcp_policy"
  | "default";

export type PolicyDecision = {
  verdict: EnforcementAction | "audit" | "hold";
  wouldVerdict?: EnforcementAction | "audit" | "hold";
  checkId?: string;
  reason: { layer: PolicyDecisionLayer; ruleId?: string; boundary?: string };
  surface: PolicySurface;
  compileHash?: string;
  degradedFrom?: "hold" | "quarantine" | "restrict";
};

export type ApplyPolicyDecisionInput = {
  surface: PolicySurface;
  compileHash?: string;
  /** Compiled wire action for a matched check */
  wireAction: GuardCheckActionWire;
  /** Base enforce result before guard overlay */
  baseEnforcement: EnforcementAction;
  checkId?: string;
  engineKey?: string;
  /** When true, audit-only mode for workspace */
  observeOnly?: boolean;
};

/** Map wire guard actions to runtime enforcement verbs with explicit degradation. */
export function applyPolicyDecision(input: ApplyPolicyDecisionInput): PolicyDecision {
  const { wireAction, baseEnforcement, surface, compileHash, checkId, engineKey, observeOnly } =
    input;

  if (observeOnly && wireAction !== "allow") {
    return {
      verdict: "audit",
      wouldVerdict: wireAction === "redact" ? "mask" : wireAction === "block" ? "block" : "audit",
      checkId,
      reason: { layer: "managed_check", ruleId: engineKey },
      surface,
      compileHash,
    };
  }

  if (wireAction === "hold") {
    if (surface === "mark" || surface === "local") {
      return {
        verdict: "audit",
        wouldVerdict: "hold",
        checkId,
        reason: { layer: "managed_check", ruleId: engineKey ?? "hold" },
        surface,
        compileHash,
        degradedFrom: "hold",
      };
    }
    return {
      verdict: "block",
      checkId,
      reason: { layer: "managed_check", ruleId: engineKey ?? "hold" },
      surface,
      compileHash,
    };
  }

  if (wireAction === "audit") {
    return {
      verdict: "audit",
      wouldVerdict: baseEnforcement,
      checkId,
      reason: { layer: "managed_check", ruleId: engineKey },
      surface,
      compileHash,
    };
  }

  if (wireAction === "allow") {
    return {
      verdict: baseEnforcement,
      checkId,
      reason: { layer: "default" },
      surface,
      compileHash,
    };
  }

  if (wireAction === "block") {
    return {
      verdict: "block",
      checkId,
      reason: { layer: "managed_check", ruleId: engineKey },
      surface,
      compileHash,
    };
  }

  // redact
  const verdict: EnforcementAction =
    baseEnforcement === "block" ? "block" : baseEnforcement === "allow" ? "mask" : baseEnforcement;

  return {
    verdict,
    checkId,
    reason: { layer: "managed_check", ruleId: engineKey },
    surface,
    compileHash,
  };
}

export function enforcementFromPolicyDecision(
  decision: PolicyDecision
): EnforcementAction {
  if (decision.verdict === "audit" || decision.verdict === "hold") {
    return "allow";
  }
  if (decision.verdict === "mask" || decision.verdict === "block" || decision.verdict === "allow") {
    return decision.verdict;
  }
  return "allow";
}
