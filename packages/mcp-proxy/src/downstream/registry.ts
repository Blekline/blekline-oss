import { createHash } from "node:crypto";
import type { McpToolPolicy } from "@blekline/contracts";

export function hashDownstreamCommand(command: string, args: string[] = []): string {
  const payload = JSON.stringify({ command, args });
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

/** Refuse proxy start when registry configured and downstream hash not approved. */
export function assertDownstreamInRegistry(
  policy: McpToolPolicy | undefined,
  commandHash: string,
  downstreamId?: string
): void {
  const servers = policy?.approvedDownstreamServers ?? [];
  if (servers.length === 0) return;
  const match = servers.some(
    (s) =>
      (downstreamId && s.id === downstreamId) ||
      (s.commandHash && s.commandHash === commandHash)
  );
  if (!match) {
    throw new Error(
      `Downstream MCP server not in approved registry (hash=${commandHash}, id=${downstreamId ?? "unknown"})`
    );
  }
}

/** Runtime drift — re-hash must match registered commandHash. */
export function detectRegistryDrift(
  policy: McpToolPolicy | undefined,
  downstreamId: string,
  currentHash: string
): boolean {
  const entry = policy?.approvedDownstreamServers?.find((s) => s.id === downstreamId);
  if (!entry?.commandHash) return false;
  return entry.commandHash !== currentHash;
}
