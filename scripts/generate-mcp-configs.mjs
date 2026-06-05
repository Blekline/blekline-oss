#!/usr/bin/env node
/**
 * MCP configs for blekline-oss (npm/npx paths, not monorepo workspace paths).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apiUrl = process.env.BLEKLINE_API_URL ?? "https://app.blekline.com";
const token = process.env.BLEKLINE_WORKSPACE_TOKEN ?? "blw_replace_with_workspace_token";

mkdirSync(resolve(root, "config"), { recursive: true });

const cursor = {
  mcpServers: {
    blekline: {
      command: "npx",
      args: ["-y", "@blekline/mcp-server"],
      env: {
        BLEKLINE_API_URL: apiUrl,
        BLEKLINE_WORKSPACE_TOKEN: token,
        BLEKLINE_CLIENT_SURFACE: "cursor",
      },
    },
    "blekline-proxy": {
      command: "npx",
      args: ["-y", "@blekline/mcp-proxy"],
      env: {
        BLEKLINE_API_URL: apiUrl,
        BLEKLINE_WORKSPACE_TOKEN: token,
        BLEKLINE_MCP_PROXY_MOCK: "1",
        BLEKLINE_CLIENT_SURFACE: "cursor",
      },
    },
  },
};

const claudeDesktop = {
  mcpServers: {
    blekline: {
      command: "npx",
      args: ["-y", "@blekline/mcp-server"],
      env: {
        BLEKLINE_API_URL: apiUrl,
        BLEKLINE_WORKSPACE_TOKEN: token,
        BLEKLINE_CLIENT_SURFACE: "claude-desktop",
      },
    },
  },
};

const codexToml = `# Generated — use published @blekline packages

[mcp_servers.blekline]
command = "npx"
args = ["-y", "@blekline/mcp-server"]
enabled = true

[mcp_servers.blekline.env]
BLEKLINE_API_URL = "${apiUrl}"
BLEKLINE_WORKSPACE_TOKEN = "${token}"
BLEKLINE_CLIENT_SURFACE = "codex"
`;

writeFileSync(resolve(root, "config/cursor.mcp.json.example"), `${JSON.stringify(cursor, null, 2)}\n`);
writeFileSync(resolve(root, "config/claude-desktop.generated.json"), `${JSON.stringify(claudeDesktop, null, 2)}\n`);
writeFileSync(resolve(root, "config/codex.config.toml.example"), codexToml);

console.log("Generated OSS MCP config examples in config/");
