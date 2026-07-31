#!/usr/bin/env node
/**
 * nhim-audit e2e — fixture-based smoke (no kind required in CI).
 * Full kind demo: run locally with scripts/nhim-audit-demo-kind.mjs
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PKG = join(ROOT, "packages/nhim-audit");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: PKG, stdio: "inherit", ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("nhim-audit e2e: build + unit tests");
run("pnpm", ["build"]);
run("pnpm", ["test"]);

console.log("nhim-audit e2e: broken fixture CLI");
const broken = spawnSync("node", ["dist/cli.js", "audit", "--fixture", "broken", "--json"], {
  cwd: PKG,
  encoding: "utf8",
  env: { ...process.env, NO_COLOR: "1" },
});
if (broken.status !== 0 && broken.status !== 1) {
  console.error(broken.stderr);
  process.exit(1);
}

console.log("nhim-audit e2e: fixed fixture score gate");
const fixed = spawnSync("node", ["dist/cli.js", "audit", "--fixture", "fixed", "--json"], {
  cwd: PKG,
  encoding: "utf8",
});
if (fixed.status !== 0) {
  console.error(fixed.stderr);
  process.exit(1);
}
const report = JSON.parse(fixed.stdout);
if (report.score.value < 75 || report.summary.critical > 0) {
  console.error("fixed fixture expected score >= 75 and 0 critical", report.score, report.summary);
  process.exit(1);
}

console.log("nhim-audit e2e: probe fixture (broken)");
const probed = spawnSync(
  "node",
  ["dist/cli.js", "audit", "--fixture", "broken", "--probe", "--eval-token", "blw_eval_e2e_test_token", "--json"],
  { cwd: PKG, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } },
);
if (probed.status !== 0 && probed.status !== 1) {
  console.error(probed.stderr);
  process.exit(1);
}
const probedReport = JSON.parse(probed.stdout);
if (!probedReport.findings.some((f) => f.evidence === "probed")) {
  console.error("expected probed findings in --probe output");
  process.exit(1);
}

console.log("nhim-audit e2e: OK");
