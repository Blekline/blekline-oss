#!/usr/bin/env node
import { loadCursorHookConfig } from "./lib/config.mjs";
import { readHookStdin } from "./lib/hook-io.mjs";
import { runAfterShellExecutionHook } from "./lib/after-shell-hook.mjs";

try {
  const input = await readHookStdin();
  const config = loadCursorHookConfig();
  const output = runAfterShellExecutionHook(input, config);
  process.stdout.write(`${JSON.stringify(output)}\n`);
} catch (err) {
  const message = err instanceof Error ? err.message : "Hook failed";
  process.stderr.write(`[blekline-cursor-after-shell] ${message}\n`);
  process.stdout.write("{}\n");
  process.exit(0);
}
