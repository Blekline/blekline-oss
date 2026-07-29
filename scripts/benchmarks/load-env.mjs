import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** Both files merge; .env.benchmark overrides env.benchmark for non-empty keys. */
const CANDIDATE_FILES = ["env.benchmark", ".env.benchmark"];

function parseEnvLines(lines, { override = false } = {}) {
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!val) continue;
    if (override || process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

/**
 * Load benchmark env from repo root (env.benchmark and/or .env.benchmark).
 * @returns {string[]} loaded file names
 */
export function loadBenchmarkEnv() {
  const loaded = [];
  for (const name of CANDIDATE_FILES) {
    const path = join(ROOT, name);
    if (!existsSync(path)) continue;
    parseEnvLines(readFileSync(path, "utf8").split("\n"), { override: loaded.length > 0 });
    loaded.push(name);
  }
  return loaded;
}

export { ROOT };
