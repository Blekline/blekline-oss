#!/usr/bin/env node
import { loadCursorHookConfig } from "./lib/config.mjs";
import { permissionOnHookError, readHookStdin } from "./lib/hook-io.mjs";

try {
  const { runBeforeShellExecutionHook } = await import("./lib/shell-guard.mjs");
  const input = await readHookStdin();
  const config = loadCursorHookConfig();
  const output = runBeforeShellExecutionHook(input, config);
  process.stdout.write(`${JSON.stringify(output)}\n`);
} catch (err) {
  const message = err instanceof Error ? err.message : "Hook failed";
  process.stderr.write(`[blekline-cursor-before-shell] ${message}\n`);
  const code = err && typeof err === "object" && "code" in err ? err.code : "";
  // Broken workspace install must not dead-lock every shell (cannot recover node_modules).
  if (code === "ERR_MODULE_NOT_FOUND") {
    process.stdout.write(`${JSON.stringify({ permission: "allow" })}\n`);
    process.exit(0);
  }
  const config = loadCursorHookConfig();
  process.stdout.write(`${JSON.stringify(permissionOnHookError(config))}\n`);
  process.exit(0);
}
