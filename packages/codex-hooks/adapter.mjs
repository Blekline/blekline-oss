#!/usr/bin/env node
import { loadCodexHookConfig, runCodexAdapter } from "./lib/adapter.mjs";

async function readHookStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

try {
  const input = await readHookStdin();
  const config = loadCodexHookConfig();
  const hint = process.argv[2] ?? "";
  const output = await runCodexAdapter(input, config, hint);
  process.stdout.write(`${JSON.stringify(output)}\n`);
} catch (err) {
  const message = err instanceof Error ? err.message : "Hook failed";
  process.stderr.write(`[blekline-codex-hooks] ${message}\n`);
  process.stdout.write("{}\n");
  process.exit(0);
}
