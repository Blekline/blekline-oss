#!/usr/bin/env node
/**
 * Verify BLEKLINE_CLIENT_SURFACE values in manifest + tools/list per verified surface.
 */
import { readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(ROOT, "integrations/manifest.json"), "utf8"));
const server = join(ROOT, "packages/mcp-server/dist/index.js");

const ALLOWED = new Set([
  "cursor",
  "claude-desktop",
  "claude-code",
  "codex",
  "continue",
  "github-copilot",
  "openhands",
  "sourcegraph-cody",
  "sdk",
  "extension",
  "unknown",
]);

const CANONICAL_TOOLS = [
  "blekline_mask_prompt",
  "blekline_simulate_policy",
  "blekline_log_governance_event",
  "blekline_evaluate_tool_call",
];

const ALIAS_TOOLS = ["blekline_classify_risk", "blekline_emit_event"];

function rpc(id, method, params = {}) {
  return JSON.stringify({ jsonrpc: "2.0", id, method, params });
}

function toolsListForSurface(surface) {
  const init = rpc(1, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "blekline-verify", version: "0.4.0" },
  });
  const list = rpc(2, "tools/list", {});
  const proc = spawnSync(process.execPath, [server], {
    input: `${init}\n${list}\n`,
    env: {
      ...process.env,
      BLEKLINE_WORKSPACE_TOKEN: process.env.BLEKLINE_WORKSPACE_TOKEN ?? "blw_smoke_test_token",
      BLEKLINE_API_URL: process.env.BLEKLINE_API_URL ?? "https://app.blekline.com",
      BLEKLINE_CLIENT_SURFACE: surface,
    },
    encoding: "utf8",
  });
  if (proc.error) return { ok: false, detail: proc.error.message };
  if (proc.status !== 0) {
    return { ok: false, detail: proc.stderr || proc.stdout || `exit ${proc.status}` };
  }
  const out = proc.stdout ?? "";
  for (const tool of [...CANONICAL_TOOLS, ...ALIAS_TOOLS]) {
    if (!out.includes(tool)) {
      return { ok: false, detail: `missing tool ${tool}` };
    }
  }
  return { ok: true };
}

const errors = [];
for (const entry of manifest.entries) {
  const s = entry.BLEKLINE_CLIENT_SURFACE;
  if (!ALLOWED.has(s)) {
    errors.push(`INVALID SURFACE ${entry.id}: ${s}`);
  }
}

const toolsListEntries = manifest.entries.filter((e) => e.verify?.includes("tools/list"));
for (const entry of toolsListEntries) {
  const result = toolsListForSurface(entry.BLEKLINE_CLIENT_SURFACE);
  if (!result.ok) {
    errors.push(`tools/list ${entry.id} (${entry.BLEKLINE_CLIENT_SURFACE}): ${result.detail}`);
  }
}

if (errors.length) {
  console.error("verify-client-surfaces FAILED:\n");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `verify-client-surfaces OK (${manifest.entries.length} manifest entries, ${toolsListEntries.length} tools/list)`
);
