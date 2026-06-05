import type { EnforceToolCallResult, EnforcementAction, ToolCallFinding } from "./enforcement.js";
import type { McpToolPolicy } from "./mcp-policy.js";
import { resolveMcpToolPolicyDecision } from "./mcp-policy.js";
import { scanTextForSecrets } from "./secret-patterns.js";

const DESTRUCTIVE_RE = /\brm\s+-rf\b|\bformat\s+c:\b|\bdrop\s+database\b/i;

function stringifyArgs(args: Record<string, unknown>): string {
  try {
    return JSON.stringify(args);
  } catch {
    return String(args);
  }
}

function maskStringValue(input: string): { text: string; count: number } {
  const findings = scanTextForSecrets(input);
  if (findings.length === 0) return { text: input, count: 0 };
  let out = input;
  let offset = 0;
  let count = 0;
  const sorted = [...findings].sort((a, b) => a.start - b.start);
  for (const f of sorted) {
    const start = f.start + offset;
    const end = f.end + offset;
    const token = `[${f.label}]`;
    out = out.slice(0, start) + token + out.slice(end);
    offset += token.length - (f.end - f.start);
    count += 1;
  }
  return { text: out, count };
}

function maskDeep(value: unknown, fieldPath: string, findings: ToolCallFinding[]): { value: unknown; count: number } {
  if (typeof value === "string") {
    const scan = scanTextForSecrets(value);
    for (const s of scan) {
      findings.push({ id: s.id, label: s.label, field: fieldPath });
    }
    const masked = maskStringValue(value);
    return { value: masked.text, count: masked.count };
  }
  if (Array.isArray(value)) {
    let count = 0;
    const next = value.map((item, i) => {
      const r = maskDeep(item, `${fieldPath}[${i}]`, findings);
      count += r.count;
      return r.value;
    });
    return { value: next, count };
  }
  if (value && typeof value === "object") {
    let count = 0;
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const r = maskDeep(v, fieldPath ? `${fieldPath}.${k}` : k, findings);
      count += r.count;
      next[k] = r.value;
    }
    return { value: next, count };
  }
  return { value, count: 0 };
}

export function enforceToolCallLocally(input: {
  toolName: string;
  arguments: Record<string, unknown>;
  requestId: string;
  mcpToolPolicy?: McpToolPolicy;
}): EnforceToolCallResult {
  const findings: ToolCallFinding[] = [];
  const blob = stringifyArgs(input.arguments);

  if (DESTRUCTIVE_RE.test(blob)) {
    findings.push({ id: "destructive_command", label: "DESTRUCTIVE", field: "arguments" });
    return {
      action: "block",
      maskedArguments: input.arguments,
      findings,
      entitiesMasked: 0,
      riskTier: "high",
      requestId: input.requestId,
    };
  }

  const secretScan = scanTextForSecrets(blob);
  for (const s of secretScan) {
    findings.push({ id: s.id, label: s.label });
  }

  const masked = maskDeep(input.arguments, "", findings);
  const entitiesMasked = masked.count;

  let action: EnforcementAction = "allow";
  let riskTier: "low" | "medium" | "high" = "low";

  const hasHighRiskSecret = secretScan.some((s) =>
    ["aws_access_key", "openai_sk", "openai_sk_proj", "stripe_sk", "jwt", "ssn"].includes(s.id)
  );

  if (hasHighRiskSecret && entitiesMasked > 0) {
    action = "mask";
    riskTier = "high";
  } else if (entitiesMasked > 0) {
    action = "mask";
    riskTier = "medium";
  }

  if (input.mcpToolPolicy) {
    action = resolveMcpToolPolicyDecision(input.mcpToolPolicy, input.toolName, action);
    if (action === "block") {
      riskTier = "high";
      if (!findings.some((f) => f.id === "policy_denied")) {
        findings.push({ id: "policy_denied", label: "POLICY", field: "toolName" });
      }
    }
  }

  return {
    action,
    maskedArguments: masked.value as Record<string, unknown>,
    findings,
    entitiesMasked,
    riskTier,
    requestId: input.requestId,
  };
}
