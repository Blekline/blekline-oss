#!/usr/bin/env node
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { findWorkspaceRoot, resolveApiUrl, resolveToken } from "./resolve-workspace.mjs";

function findServerEntry(root) {
  const monorepo = join(root, "packages", "mcp-server", "dist", "index.js");
  if (existsSync(monorepo)) return monorepo;

  const cache = join(
    process.env.HOME ?? "",
    ".cache",
    "blekline",
    "mcp-server",
    "node_modules",
    "@blekline",
    "mcp-server",
    "dist",
    "index.js",
  );
  if (existsSync(cache)) return cache;
  return null;
}

function ensureCachedServer() {
  const cacheRoot = join(process.env.HOME ?? "", ".cache", "blekline", "mcp-server");
  const entry = join(cacheRoot, "node_modules", "@blekline", "mcp-server", "dist", "index.js");
  if (existsSync(entry)) return entry;

  const npm = spawnSync(
    "npm",
    ["install", "--prefix", cacheRoot, "@blekline/mcp-server@latest", "--no-save", "--silent"],
    { stdio: "inherit" },
  );
  if (npm.status !== 0) process.exit(npm.status ?? 1);
  if (!existsSync(entry)) {
    console.error("[blekline] Failed to install @blekline/mcp-server to ~/.cache/blekline/mcp-server");
    process.exit(1);
  }
  return entry;
}

const root = findWorkspaceRoot(dirname(fileURLToPath(import.meta.url)));
const server = findServerEntry(root) ?? ensureCachedServer();
const env = {
  ...process.env,
  BLEKLINE_WORKSPACE_TOKEN: resolveToken(root),
  BLEKLINE_API_URL: resolveApiUrl(root),
  BLEKLINE_CLIENT_SURFACE: process.env.BLEKLINE_CLIENT_SURFACE?.trim() || "cursor",
  BLEKLINE_WORKSPACE_ROOT: root,
};

const child = spawn(process.execPath, [server], { env, stdio: "inherit" });
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => child.kill(sig));
}
