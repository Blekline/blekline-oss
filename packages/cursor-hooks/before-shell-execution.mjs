#!/usr/bin/env node
import { loadCursorHookConfig } from "./lib/config.mjs";
import { permissionOnHookError, readHookStdin } from "./lib/hook-io.mjs";
import { runBeforeShellExecutionHook } from "./lib/shell-guard.mjs";

try {
  const input = await readHookStdin();
  const config = loadCursorHookConfig();
  const output = runBeforeShellExecutionHook(input, config);
  process.stdout.write(`${JSON.stringify(output)}\n`);
} catch (err) {
  const message = err instanceof Error ? err.message : "Hook failed";
  process.stderr.write(`[blekline-cursor-before-shell] ${message}\n`);
  const config = loadCursorHookConfig();
  process.stdout.write(`${JSON.stringify(permissionOnHookError(config))}\n`);
  process.exit(0);
}
