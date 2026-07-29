export type McpToolPolicyAction = "allow" | "mask" | "block";

export type ApprovedDownstreamServer = {
  id: string;
  commandHash?: string;
  riskTier?: "low" | "medium" | "high";
};

export type McpToolPolicy = {
  allowedTools: string[];
  deniedTools: string[];
  defaultAction: McpToolPolicyAction;
  approvedDownstreamServers?: ApprovedDownstreamServer[];
};

export const DEFAULT_MCP_TOOL_POLICY: McpToolPolicy = {
  allowedTools: [],
  deniedTools: [],
  defaultAction: "mask",
  approvedDownstreamServers: [],
};

export function normalizeMcpToolPolicy(raw: unknown): McpToolPolicy {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_MCP_TOOL_POLICY };
  const o = raw as Record<string, unknown>;
  const allowedTools = Array.isArray(o.allowedTools)
    ? o.allowedTools.filter((t): t is string => typeof t === "string").map((t) => t.trim()).filter(Boolean).slice(0, 64)
    : [];
  const deniedTools = Array.isArray(o.deniedTools)
    ? o.deniedTools.filter((t): t is string => typeof t === "string").map((t) => t.trim()).filter(Boolean).slice(0, 64)
    : [];
  const defaultAction =
    o.defaultAction === "allow" || o.defaultAction === "mask" || o.defaultAction === "block"
      ? o.defaultAction
      : "mask";
  const approvedDownstreamServers = Array.isArray(o.approvedDownstreamServers)
    ? o.approvedDownstreamServers
        .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
        .map((x): ApprovedDownstreamServer => {
          const riskRaw = x.riskTier;
          const riskTier: ApprovedDownstreamServer["riskTier"] =
            riskRaw === "low" || riskRaw === "medium" || riskRaw === "high" ? riskRaw : undefined;
          return {
            id: String(x.id ?? "").slice(0, 64),
            commandHash: typeof x.commandHash === "string" ? x.commandHash.slice(0, 128) : undefined,
            riskTier,
          };
        })
        .filter((x) => x.id)
        .slice(0, 32)
    : [];
  return { allowedTools, deniedTools, defaultAction, approvedDownstreamServers };
}

/** Resolve workspace MCP tool policy before local/cloud enforcement. */
export function resolveMcpToolPolicyDecision(
  policy: McpToolPolicy,
  toolName: string,
  localAction: McpToolPolicyAction
): McpToolPolicyAction {
  const name = toolName.trim().toLowerCase();
  if (policy.deniedTools.some((t) => t.toLowerCase() === name)) return "block";
  if (policy.allowedTools.length > 0) {
    const allowed = policy.allowedTools.some((t) => t.toLowerCase() === name);
    if (!allowed) return "block";
  }
  if (localAction === "block") return "block";
  if (policy.defaultAction === "block") return "block";
  if (localAction === "mask") return "mask";
  return policy.defaultAction;
}
