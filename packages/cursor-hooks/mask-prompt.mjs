#!/usr/bin/env node
import { loadCursorHookConfig } from "./lib/config.mjs";
import { continueOnHookError, readHookStdin } from "./lib/hook-io.mjs";
import { runMaskPromptHook } from "./lib/mask-prompt-hook.mjs";

try {
  const input = await readHookStdin();
  const config = loadCursorHookConfig();
  const output = await runMaskPromptHook(input, config);
  process.stdout.write(`${JSON.stringify(output)}\n`);
} catch (err) {
  const message = err instanceof Error ? err.message : "Hook failed";
  process.stderr.write(`[blekline-cursor-mask-prompt] ${message}\n`);
  const config = loadCursorHookConfig();
  process.stdout.write(`${JSON.stringify(continueOnHookError(config))}\n`);
  process.exit(0);
}
