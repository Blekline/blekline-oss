#!/usr/bin/env node
import { loadCursorHookConfig, runSessionStartHook } from "./lib/session-start-hook.mjs";

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

try {
  const input = await readStdin();
  const config = loadCursorHookConfig();
  const output = runSessionStartHook(input, config);
  process.stdout.write(`${JSON.stringify(output)}\n`);
} catch (err) {
  const message = err instanceof Error ? err.message : "Hook failed";
  process.stderr.write(`[blekline-cursor-session-start] ${message}\n`);
  process.stdout.write(`${JSON.stringify({})}\n`);
  process.exit(0);
}
