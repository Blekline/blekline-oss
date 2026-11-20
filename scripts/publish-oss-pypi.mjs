#!/usr/bin/env node
/**
 * Publish blekline-client to PyPI when version is not already published.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PYPROJECT = join(ROOT, "packages/client-python/pyproject.toml");

function pyVersion() {
  const text = readFileSync(PYPROJECT, "utf8");
  const m = text.match(/^version\s*=\s*"([^"]+)"/m);
  if (!m) throw new Error("version not found in pyproject.toml");
  return m[1];
}

function published(version) {
  try {
    const out = execSync(`python3 -m pip index versions blekline-client 2>/dev/null | head -1`, {
      encoding: "utf8",
    });
    return out.includes(version);
  } catch {
    return false;
  }
}

const version = pyVersion();
if (published(version)) {
  console.log(`skip blekline-client ${version} (already on PyPI or index unavailable)`);
  process.exit(0);
}

console.log(`publish blekline-client ${version}`);
execSync(`cd "${join(ROOT, "packages/client-python")}" && python3 -m pip install build twine -q && python3 -m build && python3 -m twine upload dist/*`, {
  stdio: "inherit",
});