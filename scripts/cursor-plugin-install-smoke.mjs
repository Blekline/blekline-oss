#!/usr/bin/env node
/**
 * Install-smoke for plugins/cursor — mimics SUBMISSION_KIT local install checks.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN_SRC = join(ROOT, "plugins", "cursor");
const PLUGIN_DEST = join(homedir(), ".cursor", "plugins", "local", "blekline");

function runHook(scriptRel, input, env = {}) {
  const script = join(PLUGIN_DEST, "hooks", scriptRel);
  const proc = spawnSync("bash", [script], {
    input: `${JSON.stringify(input)}\n`,
    env: { ...process.env, BLEKLINE_CURSOR_EMIT_AUDIT: "0", ...env },
    encoding: "utf8",
  });
  if (proc.status !== 0) {
    throw new Error(`${scriptRel} exited ${proc.status}: ${proc.stderr}`);
  }
  const lines = (proc.stdout ?? "").trim().split("\n").filter(Boolean);
  return JSON.parse(lines[lines.length - 1] ?? "{}");
}

function assertManifest() {
  const manifestPath = join(PLUGIN_SRC, ".cursor-plugin", "plugin.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.name !== "blekline" || manifest.displayName !== "Blekline") {
    throw new Error("manifest name/displayName mismatch");
  }
  if (!existsSync(join(PLUGIN_SRC, "assets", "logo.svg")) && !existsSync(join(PLUGIN_SRC, "assets", "logo.png"))) {
    throw new Error("assets/logo.svg or logo.png missing");
  }
  const mcp = JSON.parse(readFileSync(join(PLUGIN_SRC, "mcp.json"), "utf8"));
  const token = mcp.mcpServers?.blekline?.env?.BLEKLINE_WORKSPACE_TOKEN;
  if (token !== "${BLEKLINE_WORKSPACE_TOKEN}") {
    throw new Error("mcp.json must use ${BLEKLINE_WORKSPACE_TOKEN} plugin variable");
  }
  if (mcp.mcpServers?.blekline?.command !== "node") {
    throw new Error("mcp.json must use node workspace launchers");
  }
  if (!mcp.mcpServers?.blekline?.args?.[0]?.includes(".cursor/blekline/run-mcp-server.mjs")) {
    throw new Error("mcp.json must use .cursor/blekline/run-mcp-server.mjs (no ${workspaceFolder} in plugin MCP)");
  }
  if (mcp.mcpServers?.blekline?.envFile !== ".blekline/mcp.env") {
    throw new Error("mcp.json must use envFile .blekline/mcp.env");
  }
  console.log("manifest + assets OK");
}

function assertMcpLauncher() {
  const launcher = join(ROOT, ".cursor", "blekline", "run-mcp-server.mjs");
  if (!existsSync(launcher)) {
    throw new Error("missing .cursor/blekline/run-mcp-server.mjs — run cursor-hooks init first");
  }
  const proc = spawnSync(process.execPath, [launcher], {
    input: `${JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "smoke", version: "1" },
      },
    })}\n`,
    cwd: ROOT,
    env: {
      ...process.env,
      ...(() => {
        try {
          const dotenv = readFileSync(join(ROOT, ".blekline", "mcp.env"), "utf8");
          const out = {};
          for (const line of dotenv.split("\n")) {
            const t = line.trim();
            if (!t || t.startsWith("#")) continue;
            const i = t.indexOf("=");
            if (i <= 0) continue;
            out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
          }
          return out;
        } catch {
          return {};
        }
      })(),
    },
    encoding: "utf8",
  });
  if (proc.status !== 0) {
    throw new Error(`workspace MCP launcher failed: ${proc.stderr}`);
  }
  const line = (proc.stdout ?? "").trim().split("\n").find((l) => l.includes('"serverInfo"'));
  if (!line?.includes("blekline-mcp-server")) {
    throw new Error("workspace MCP launcher did not return initialize response");
  }
  console.log("MCP workspace launcher initialize OK");
}

function installLocal() {
  rmSync(PLUGIN_DEST, { recursive: true, force: true });
  mkdirSync(join(homedir(), ".cursor", "plugins", "local"), { recursive: true });
  cpSync(PLUGIN_SRC, PLUGIN_DEST, { recursive: true });
  console.log(`installed → ${PLUGIN_DEST}`);
}

function main() {
  assertManifest();
  assertMcpLauncher();

  const init = spawnSync(process.execPath, [join(ROOT, "packages", "cursor-hooks", "init.mjs")], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (init.status !== 0) {
    console.error(init.stdout);
    console.error(init.stderr);
    throw new Error("cursor-hooks init failed");
  }
  console.log("cursor-hooks init OK");

  installLocal();

  const mask = runHook("blekline-mask-prompt.sh", { prompt: "AWS AKIAIOSFODNN7EXAMPLE" });
  if (mask.continue !== false) {
    throw new Error("expected mask-prompt block for hard secret");
  }
  console.log("mask-prompt block OK");

  const shell = runHook("blekline-before-shell-execution.sh", { command: "cat .env" });
  if (shell.permission !== "deny") {
    throw new Error("expected shell deny for sensitive path command");
  }
  console.log("before-shell-execution deny OK");

  const read = runHook("blekline-pre-tool-use.sh", {
    tool_name: "Read",
    tool_input: { file_path: "/app/.env" },
  });
  if (read.permission !== "deny") {
    throw new Error("expected pre-tool-use deny for .env read");
  }
  console.log("pre-tool-use deny OK");

  console.log("cursor-plugin-install-smoke OK");
}

try {
  main();
} catch (err) {
  console.error(`cursor-plugin-install-smoke failed: ${err.message}`);
  process.exit(1);
}
