#!/usr/bin/env node
/**
 * Blekline ICP benchmark suite — B1–B8 across adapters.
 *
 * Usage:
 *   pnpm benchmark:run
 *   pnpm benchmark:run --quick
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadBenchmarkEnv, ROOT } from "./load-env.mjs";
import { SCENARIOS } from "./scenarios.mjs";
import * as blekline from "./adapters/blekline.mjs";
import * as baseline from "./adapters/baseline.mjs";
import * as lakera from "./adapters/lakera.mjs";
import * as kong from "./adapters/kong.mjs";
import * as onecli from "./adapters/onecli.mjs";

const envFiles = loadBenchmarkEnv();
if (envFiles.length > 0) {
  console.log(`Benchmark env loaded: ${envFiles.join(", ")}`);
}

const quick = process.argv.includes("--quick");
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "results");

const ALL_ADAPTERS = [
  { mod: blekline, quick: true },
  { mod: baseline, quick: true },
  { mod: lakera, quick: false },
  { mod: kong, quick: false },
  { mod: onecli, quick: false },
];

function gitSha() {
  const r = spawnSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" });
  return r.stdout?.trim() || "unknown";
}

function readPkgVersion(name) {
  const path = join(ROOT, "packages", name, "package.json");
  if (!existsSync(path)) return "unknown";
  return JSON.parse(readFileSync(path, "utf8")).version;
}

async function main() {
  spawnSync("pnpm", ["--filter", "@blekline/nhim-audit", "build"], {
    cwd: ROOT,
    stdio: "inherit",
  });

  const adapters = quick ? ALL_ADAPTERS.filter((a) => a.quick) : ALL_ADAPTERS;
  const runAt = new Date().toISOString();
  const runId = runAt.replace(/[:.]/g, "-");

  /** @type {Record<string, Record<string, unknown>>} */
  const matrix = {};

  for (const scenario of SCENARIOS) {
    matrix[scenario.id] = {
      id: scenario.id,
      title: scenario.title,
      question: scenario.question,
      metric: scenario.metric,
      systems: scenario.systems,
      results: {},
    };
  }

  for (const { mod } of adapters) {
    console.log(`\n=== ${mod.label} (${mod.id}) ===`);
    const results = await mod.runAll();
    for (const [scenarioId, result] of Object.entries(results)) {
      if (matrix[scenarioId]) {
        matrix[scenarioId].results[mod.id] = result;
      }
      console.log(`  ${scenarioId}: ${result.score}`);
    }
  }

  const report = {
    runId,
    runAt,
    gitSha: gitSha(),
    mode: quick ? "quick" : "full",
    versions: {
      contracts: readPkgVersion("contracts"),
      "nhim-audit": readPkgVersion("nhim-audit"),
      "runtime-engine": readPkgVersion("runtime-engine"),
    },
    adapters: adapters.map((a) => a.mod.id),
    scenarios: matrix,
    methodology: "https://app.blekline.com/docs/reference/benchmarks",
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, `${runId}.json`);
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(OUT_DIR, "latest.json"), `${JSON.stringify(report, null, 2)}\n`);

  if (quick) {
    const mustPass = ["B1", "B2", "B3", "B5", "B6", "B8"];
    for (const id of mustPass) {
      const score = matrix[id]?.results?.blekline?.score;
      if (score !== "pass") {
        console.error(`Quick gate failed: blekline ${id} expected pass, got ${score}`);
        process.exit(1);
      }
    }
    const baselineMustFail = ["B1", "B2", "B5"];
    for (const id of baselineMustFail) {
      const score = matrix[id]?.results?.baseline?.score;
      if (score !== "fail") {
        console.error(`Quick gate failed: baseline ${id} expected fail, got ${score}`);
        process.exit(1);
      }
    }
    console.log("Quick gate: OK");
  }

  console.log(`\nWrote ${outPath}`);
  return report;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
