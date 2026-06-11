#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = resolve(root, "packages/mcp-server/dist/index.js");

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

const env = {
  ...process.env,
  BLEKLINE_WORKSPACE_TOKEN: process.env.BLEKLINE_WORKSPACE_TOKEN ?? "blw_smoke_test_token",
  BLEKLINE_API_URL: process.env.BLEKLINE_API_URL ?? "https://app.blekline.com",
};

const init = rpc(1, "initialize", {
  protocolVersion: "2024-11-05",
  capabilities: {},
  clientInfo: { name: "blekline-smoke", version: "0.4.0" },
});

const list = rpc(2, "tools/list", {});

const proc = spawnSync(process.execPath, [server], {
  input: `${init}\n${list}\n`,
  env,
  encoding: "utf8",
});

if (proc.error) {
  console.error("Smoke failed:", proc.error.message);
  process.exit(1);
}

const out = proc.stdout ?? "";
for (const tool of [...CANONICAL_TOOLS, ...ALIAS_TOOLS]) {
  if (!out.includes(tool)) {
    console.error(`Smoke failed: ${tool} not in tools/list output`);
    console.error(out.slice(0, 800));
    process.exit(1);
  }
}

if (!out.includes("readOnlyHint") && !out.includes('"readOnlyHint"')) {
  console.warn("Smoke warn: readOnlyHint annotations not found in output (SDK may omit in JSON)");
}

console.log("MCP smoke OK: tools/list includes all canonical + alias tools");
console.log("Note: tools/call integration requires valid BLEKLINE_WORKSPACE_TOKEN against live API.");
