export type DownstreamSpawnSpec = {
  command: string;
  args: string[];
};

/** Parses BLEKLINE_DOWNSTREAM_MCP_COMMAND (comma-separated command + args). */
export function parseDownstreamMcpCommand(): DownstreamSpawnSpec | null {
  const raw = process.env.BLEKLINE_DOWNSTREAM_MCP_COMMAND?.trim();
  if (!raw) return null;
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return { command: parts[0]!, args: parts.slice(1) };
}

/** Command vector used for registry hashing and spawn — must match. */
export function resolveDownstreamSpawnSpec(): DownstreamSpawnSpec {
  const parsed = parseDownstreamMcpCommand();
  if (parsed) return parsed;

  const command = process.env.BLEKLINE_DOWNSTREAM_COMMAND?.trim() || "node";
  const args = (process.env.BLEKLINE_DOWNSTREAM_ARGS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return { command, args };
}
