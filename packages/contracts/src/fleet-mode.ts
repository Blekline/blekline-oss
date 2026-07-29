export type FleetMode = "normal" | "deny_all_tools" | "deny_writes";

export const DEFAULT_FLEET_MODE: FleetMode = "normal";

export function normalizeFleetMode(raw: unknown): FleetMode {
  if (raw === "deny_all_tools" || raw === "deny_writes") return raw;
  return "normal";
}

/** Write-class tool name patterns — fleet deny_writes blocks these when mode active. */
export const WRITE_TOOL_PATTERNS = [
  /^write_/i,
  /trigger_internal_transaction/i,
  /delete_/i,
  /update_/i,
  /create_/i,
  /run_sql/i,
];

export function isWriteTool(toolName: string): boolean {
  return WRITE_TOOL_PATTERNS.some((p) => p.test(toolName));
}
