#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = resolve(root, "packages/mcp-server/dist/index.js");

const init = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "blekline-smoke", version: "0.1.0" },
  },
});

const list = JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });

const proc = spawnSync(process.execPath, [server], {
  input: `${init}\n${list}\n`,
  env: {
    ...process.env,
    BLEKLINE_WORKSPACE_TOKEN: process.env.BLEKLINE_WORKSPACE_TOKEN ?? "blw_smoke_test_token",
    BLEKLINE_API_URL: process.env.BLEKLINE_API_URL ?? "https://app.blekline.com",
  },
  encoding: "utf8",
});

if (proc.error) {
  console.error("Smoke failed:", proc.error.message);
  process.exit(1);
}

const out = proc.stdout ?? "";
if (!out.includes("blekline_mask_prompt")) {
  console.error("Smoke failed: blekline_mask_prompt not in tools/list output");
  console.error(out.slice(0, 500));
  process.exit(1);
}

console.log("MCP smoke OK: tools/list includes blekline_mask_prompt");
