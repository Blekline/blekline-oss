#!/usr/bin/env node
/**
 * Headless QA for @blekline/codex-hooks (adapter over cursor-hooks).
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const unit = spawnSync(process.execPath, ["--test", "tests/adapter.test.mjs"], {
  cwd: join(root, "packages/codex-hooks"),
  encoding: "utf8",
});

if (unit.status !== 0) {
  console.error(unit.stdout);
  console.error(unit.stderr);
  process.exit(unit.status ?? 1);
}

console.log("codex-hooks unit tests OK");

const adapter = join(root, "packages/codex-hooks/adapter.mjs");
const cases = [
  {
    name: "user-prompt-empty",
    input: { hook_event_name: "UserPromptSubmit", prompt: "   " },
    assert: (p) => p.decision !== "block",
  },
  {
    name: "bash-cat-env",
    input: {
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: { command: "cat .env" },
    },
    assert: (p) => p.decision === "block",
  },
];

for (const hookCase of cases) {
  const proc = spawnSync(process.execPath, [adapter], {
    input: `${JSON.stringify(hookCase.input)}\n`,
    env: {
      ...process.env,
      BLEKLINE_CURSOR_EMIT_AUDIT: "0",
      BLEKLINE_CURSOR_ENTERPRISE_PRESET: "1",
      ...(hookCase.env ?? {}),
    },
    encoding: "utf8",
  });
  if (proc.status !== 0) {
    console.error(`codex-hook contract failed: ${hookCase.name}`, proc.stderr);
    process.exit(1);
  }
  const lines = (proc.stdout ?? "").trim().split("\n").filter(Boolean);
  const payload = JSON.parse(lines[lines.length - 1] ?? "{}");
  if (!hookCase.assert(payload)) {
    console.error(`codex-hook contract failed: ${hookCase.name}`, payload);
    process.exit(1);
  }
}

console.log("codex-hook-smoke OK");
