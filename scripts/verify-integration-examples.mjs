#!/usr/bin/env node
/**
 * Lint integration examples: README platform path + ban legacy doc slugs in examples/.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXAMPLES = join(ROOT, "examples");
const MANIFEST = JSON.parse(readFileSync(join(ROOT, "integrations/manifest.json"), "utf8"));

const LEGACY_SLUGS = [
  "get-started/eval-journey",
  "get-started/nhim-audit-quickstart",
  "tools/nhim-audit",
];
const BANNED_WORDS = [/\bcookbook\b/i, /\brecipe gallery\b/i];
const PLATFORM_MARKERS = [
  "runtime-policy",
  "workflows-and-runs",
  "Platform path",
];

const errors = [];

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "_template") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (name === "README.md") files.push(p);
  }
  return files;
}

for (const file of walk(EXAMPLES)) {
  const text = readFileSync(file, "utf8");
  const rel = file.slice(ROOT.length + 1);
  for (const slug of LEGACY_SLUGS) {
    if (text.includes(slug)) errors.push(`LEGACY SLUG in ${rel}: ${slug}`);
  }
  for (const pat of BANNED_WORDS) {
    if (pat.test(text)) errors.push(`BANNED COPY in ${rel}: ${pat}`);
  }
  if (!rel.includes("_template") && !PLATFORM_MARKERS.some((m) => text.includes(m))) {
    errors.push(`MISSING platform path markers in ${rel}`);
  }
}

for (const entry of MANIFEST.entries) {
  if (entry.tier !== "example") continue;
  const ep = join(ROOT, entry.examplePath ?? "");
  if (!existsSync(ep)) {
    errors.push(`MISSING examplePath: ${entry.examplePath}`);
  }
}

if (errors.length) {
  console.error("verify-integration-examples FAILED:\n");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("verify-integration-examples OK");