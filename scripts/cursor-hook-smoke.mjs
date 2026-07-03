#!/usr/bin/env node
/**
 * Headless QA for @blekline/cursor-hooks (unit + optional live mask).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findHardSecrets } from "../packages/cursor-hooks/lib/mask-prompt-hook.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseEnvFile(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function loadToken() {
  const env = {
    ...process.env,
    ...parseEnvFile(join(root, ".env")),
    ...parseEnvFile(join(root, "webapp", ".env.local")),
  };
  return env.BLEKLINE_WORKSPACE_TOKEN ?? env.BLEKLINE_SAMPLE_WORKSPACE_TOKEN ?? "";
}

const unit = spawnSync(process.execPath, ["--test", "tests/hooks.test.mjs"], {
  cwd: join(root, "packages/cursor-hooks"),
  encoding: "utf8",
});

if (unit.status !== 0) {
  console.error(unit.stdout);
  console.error(unit.stderr);
  process.exit(unit.status ?? 1);
}

console.log("cursor-hooks unit tests OK");

const hookCases = [
  {
    name: "mask-prompt",
    script: join(root, "packages/cursor-hooks/mask-prompt.mjs"),
    input: { prompt: "   " },
    assert: (p) => p.continue === true,
  },
  {
    name: "before-read-file",
    script: join(root, "packages/cursor-hooks/before-read-file.mjs"),
    input: { file_path: "/project/.env" },
    assert: (p) => p.permission === "deny",
  },
  {
    name: "before-shell-execution",
    script: join(root, "packages/cursor-hooks/before-shell-execution.mjs"),
    input: { command: "cat .env" },
    assert: (p) => p.permission === "deny",
  },
  {
    name: "pre-tool-use",
    script: join(root, "packages/cursor-hooks/pre-tool-use.mjs"),
    input: { tool_name: "Read", tool_input: { file_path: "/app/.env" } },
    assert: (p) => p.permission === "deny",
  },
  {
    name: "before-mcp-execution",
    script: join(root, "packages/cursor-hooks/before-mcp-execution.mjs"),
    input: {
      tool_name: "write_file",
      tool_input: { content: "AWS AKIAIOSFODNN7EXAMPLE" },
      command: "npx other-mcp",
    },
    env: { BLEKLINE_CURSOR_MCP_GUARD_MODE: "local" },
    assert: (p) => p.permission === "deny",
  },
  {
    name: "after-shell-execution",
    script: join(root, "packages/cursor-hooks/after-shell-execution.mjs"),
    input: { command: "echo hi", output: "hi" },
    assert: (p) => typeof p === "object",
  },
];

for (const hookCase of hookCases) {
  const proc = spawnSync(process.execPath, [hookCase.script], {
    input: `${JSON.stringify(hookCase.input)}\n`,
    env: {
      ...process.env,
      BLEKLINE_CURSOR_EMIT_AUDIT: "0",
      ...(hookCase.env ?? {}),
    },
    encoding: "utf8",
  });
  if (proc.status !== 0) {
    console.error(`cursor-hook contract failed: ${hookCase.name}`, proc.stderr);
    process.exit(1);
  }
  const lines = (proc.stdout ?? "").trim().split("\n").filter(Boolean);
  const payload = JSON.parse(lines[lines.length - 1] ?? "{}");
  if (!hookCase.assert(payload)) {
    console.error(`cursor-hook contract failed: ${hookCase.name}`, payload);
    process.exit(1);
  }
}

console.log("cursor-hook contract tests OK");

const hookScript = join(root, "packages/cursor-hooks/mask-prompt.mjs");
const token = loadToken();

if (!token) {
  const hard = findHardSecrets("AWS AKIAIOSFODNN7EXAMPLE");
  if (hard.length === 0) {
    console.error("cursor-hook smoke failed: local secret detector regression");
    process.exit(1);
  }
  console.log("cursor-hook smoke OK (local secret detect, skipping live mask — no token)");
  process.exit(0);
}

const proc = spawnSync(process.execPath, [hookScript], {
  input: `${JSON.stringify({
    prompt: "Contact alice@corp.com AWS AKIAIOSFODNN7EXAMPLE",
  })}\n`,
  env: {
    ...process.env,
    BLEKLINE_WORKSPACE_TOKEN: token,
    BLEKLINE_API_URL: process.env.BLEKLINE_API_URL ?? "https://app.blekline.com",
    BLEKLINE_CURSOR_COPY_MASKED: "0",
  },
  encoding: "utf8",
});

if (proc.error) {
  console.error("cursor-hook smoke failed:", proc.error.message);
  process.exit(1);
}

const lines = (proc.stdout ?? "").trim().split("\n").filter(Boolean);
const payload = JSON.parse(lines[lines.length - 1] ?? "{}");

if (payload.continue !== false) {
  console.error("cursor-hook smoke failed: expected continue=false for sensitive prompt");
  console.error(payload);
  process.exit(1);
}

const msg = String(payload.user_message ?? "");
if (!msg.includes("entit") || msg.includes("[EMAIL")) {
  console.error("cursor-hook smoke failed: expected concise block message without masked body");
  console.error(payload);
  process.exit(1);
}

console.log("cursor-hook live mask OK (blocked with masked preview)");
console.log("cursor-hook-smoke OK");
