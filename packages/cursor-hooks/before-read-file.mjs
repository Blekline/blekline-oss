#!/usr/bin/env node
import { loadCursorHookConfig } from "./lib/config.mjs";
import { runBeforeReadFileHook } from "./lib/before-read-file-hook.mjs";
import { permissionOnHookError, readHookStdin } from "./lib/hook-io.mjs";

try {
  const input = await readHookStdin();
  const config = loadCursorHookConfig();
  const output = runBeforeReadFileHook(input, config);
  process.stdout.write(`${JSON.stringify(output)}\n`);
} catch (err) {
  const message = err instanceof Error ? err.message : "Hook failed";
  process.stderr.write(`[blekline-cursor-before-read-file] ${message}\n`);
  const config = loadCursorHookConfig();
  process.stdout.write(`${JSON.stringify(permissionOnHookError(config))}\n`);
  process.exit(0);
}
