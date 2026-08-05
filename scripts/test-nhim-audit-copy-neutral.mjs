#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PKG = join(dirname(fileURLToPath(import.meta.url)), "../packages/nhim-audit");

const out = spawnSync(
  "node",
  ["dist/cli.js", "audit", "--fixture", "broken", "--plain"],
  { cwd: PKG, encoding: "utf8" },
);
if (out.status !== 0 && out.status !== 1) {
  console.error(out.stderr);
  process.exit(1);
}

const text = out.stdout + out.stderr;
const forbidden = [/enterprise@blekline\.com/i, /BLEKLINE\s+nhim-audit/i];
for (const pattern of forbidden) {
  if (pattern.test(text)) {
    console.error("generic plain output contains vendor CTA/branding:", pattern);
    process.exit(1);
  }
}

if (!/NHIM AUDIT/i.test(text)) {
  console.error("expected neutral NHIM AUDIT header");
  process.exit(1);
}

console.log("Copy neutral check OK");
