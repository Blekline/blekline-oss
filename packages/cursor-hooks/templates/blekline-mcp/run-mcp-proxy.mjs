#!/usr/bin/env node
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { findWorkspaceRoot, resolveApiUrl, resolveToken } from "./resolve-workspace.mjs";

function findProxyEntry(root) {
  const monorepo = join(root, "packages", "mcp-proxy", "dist", "index.js");
  if (existsSync(monorepo)) return monorepo;

  const cache = join(
    process.env.HOME ?? "",
    ".cache",
    "blekline",
    "mcp-proxy",
    "node_modules",
    "@blekline",
    "mcp-proxy",
    "dist",
    "index.js",
  );
  if (existsSync(cache)) return cache;
  return null;
}

function ensureCachedProxy() {
  const cacheRoot = join(process.env.HOME ?? "", ".cache", "blekline", "mcp-proxy");
  const entry = join(cacheRoot, "node_modules", "@blekline", "mcp-proxy", "dist", "index.js");
  if (existsSync(entry)) return entry;

  const npm = spawnSync(
    "npm",
    ["install", "--prefix", cacheRoot, "@blekline/mcp-proxy@latest", "--no-save", "--silent"],
    { stdio: "inherit" },
  );
  if (npm.status !== 0) process.exit(npm.status ?? 1);
  if (!existsSync(entry)) {
    console.error("[blekline] Failed to install @blekline/mcp-proxy to ~/.cache/blekline/mcp-proxy");
    process.exit(1);
  }
  return entry;
}

const root = findWorkspaceRoot(dirname(fileURLToPath(import.meta.url)));
const proxy = findProxyEntry(root) ?? ensureCachedProxy();
const env = {
  ...process.env,
  BLEKLINE_WORKSPACE_TOKEN: resolveToken(root),
  BLEKLINE_API_URL: resolveApiUrl(root),
  BLEKLINE_CLIENT_SURFACE: process.env.BLEKLINE_CLIENT_SURFACE?.trim() || "cursor",
  BLEKLINE_MCP_PROXY_MOCK: process.env.BLEKLINE_MCP_PROXY_MOCK?.trim() || "1",
  BLEKLINE_WORKSPACE_ROOT: root,
};

const child = spawn(process.execPath, [proxy], { env, stdio: "inherit" });
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => child.kill(sig));
}
