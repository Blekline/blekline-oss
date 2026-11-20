#!/usr/bin/env node
/**
 * Static smoke for integration examples (no live tokens).
 */
import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const MANIFEST = JSON.parse(readFileSync(join(ROOT, "integrations/manifest.json"), "utf8"));
/** C3 index-only examples (README + MCP pack table). */
const README_ONLY_EXAMPLES = new Set(["examples/agents/mcp-pack"]);
const errors = [];

function syntaxCheckMjs(rel) {
  const full = join(ROOT, rel);
  if (!existsSync(full)) {
    errors.push(`MISSING script: ${rel}`);
    return;
  }
  const r = spawnSync(process.execPath, ["--check", full], { encoding: "utf8" });
  if (r.status !== 0) {
    errors.push(`SYNTAX ${rel}: ${r.stderr || r.stdout}`);
  }
}

for (const entry of MANIFEST.entries) {
  if (entry.tier !== "example" || !entry.examplePath) continue;
  const base = entry.examplePath;
  if (!README_ONLY_EXAMPLES.has(base)) {
    const hasEntry =
      existsSync(join(ROOT, base, "index.mjs")) ||
      existsSync(join(ROOT, base, "main.py")) ||
      existsSync(join(ROOT, base, "main.go"));
    if (!hasEntry) {
      errors.push(`MISSING entry script (index.mjs, main.py, or main.go) under ${base}`);
    }
  }
  for (const name of ["index.mjs"]) {
    const rel = `${base}/${name}`;
    if (existsSync(join(ROOT, rel))) syntaxCheckMjs(rel);
  }
}

const lint = spawnSync(process.execPath, [join(ROOT, "scripts/verify-integration-examples.mjs")], {
  encoding: "utf8",
});
if (lint.status !== 0) {
  errors.push("verify-integration-examples failed");
  if (lint.stderr) console.error(lint.stderr);
  if (lint.stdout) console.error(lint.stdout);
}

if (errors.length) {
  console.error("example:smoke FAILED:\n");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("example:smoke OK");