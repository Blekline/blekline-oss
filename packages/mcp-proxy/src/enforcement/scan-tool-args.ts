import { scanTextForSecrets } from "@blekline/contracts";
import type { ToolCallFinding } from "@blekline/contracts";

const DESTRUCTIVE_RE = /\brm\s+-rf\b|\bformat\s+c:\b|\bdrop\s+database\b/i;

export type ScanToolArgsResult = {
  findings: ToolCallFinding[];
  hasDestructive: boolean;
  secretCount: number;
};

/** Fast local scan of MCP tool arguments (used before cloud enforce-tool-call). */
export function scanToolArgs(args: Record<string, unknown>): ScanToolArgsResult {
  let blob = "";
  try {
    blob = JSON.stringify(args);
  } catch {
    blob = String(args);
  }

  const findings: ToolCallFinding[] = [];
  if (DESTRUCTIVE_RE.test(blob)) {
    findings.push({ id: "destructive_command", label: "DESTRUCTIVE", field: "arguments" });
  }

  for (const s of scanTextForSecrets(blob)) {
    findings.push({ id: s.id, label: s.label });
  }

  return {
    findings,
    hasDestructive: DESTRUCTIVE_RE.test(blob),
    secretCount: findings.filter((f) => f.id !== "destructive_command").length,
  };
}
