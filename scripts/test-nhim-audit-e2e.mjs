#!/usr/bin/env node
/**
 * nhim-audit e2e — fixture-based smoke (no kind required in CI).
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
const brokenReport = JSON.parse(broken.stdout);
if (brokenReport.schemaVersion !== "2.0" || brokenReport.score.staticGateStatus !== "fail") {
  console.error("broken fixture expected schema 2.0 and staticGateStatus fail");
  process.exit(1);
}

console.log("nhim-audit e2e: fixed-generic score gate");
const fixed = spawnSync(
  "node",
  ["dist/cli.js", "audit", "--fixture", "fixed-generic", "--json"],
  { cwd: PKG, encoding: "utf8" },
);
if (fixed.status !== 0) {
  console.error(fixed.stderr);
  process.exit(1);
}
const report = JSON.parse(fixed.stdout);
if (report.score.value < 75 || report.summary.critical > 0) {
  console.error("fixed-generic expected score >= 75 and 0 critical", report.score, report.summary);
  process.exit(1);
}
if (report.score.staticGateStatus !== "unknown") {
  console.error("fixed-generic without probe must have staticGateStatus unknown");
  process.exit(1);
}

console.log("nhim-audit e2e: hostnetwork-broken NHIM-019");
const hn = spawnSync(
  "node",
  ["dist/cli.js", "audit", "--fixture", "hostnetwork-broken", "--only-critical", "--plain"],
  { cwd: PKG, encoding: "utf8" },
);
if (!hn.stdout.includes("NHIM-019")) {
  console.error("expected NHIM-019 in hostnetwork-broken output");
  process.exit(1);
}

console.log("nhim-audit e2e: probe requires allow-namespaces");
const probeDenied = spawnSync(
  "node",
  ["dist/cli.js", "audit", "--fixture", "broken", "--probe", "--eval-token", "blw_eval_e2e_test_token"],
  { cwd: PKG, encoding: "utf8" },
);
if (probeDenied.status === 0) {
  console.error("probe without --probe-allow-namespaces should fail");
  process.exit(1);
}

console.log("nhim-audit e2e: probe fixture (broken)");
const probed = spawnSync(
  "node",
  [
    "dist/cli.js",
    "audit",
    "--fixture",
    "broken",
    "--probe",
    "--probe-allow-namespaces",
    "default",
    "agent-ns",
    "--eval-token",
    "blw_eval_e2e_test_token",
    "--json",
  ],
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

console.log("nhim-audit e2e: QA scripts");
run("node", [join(ROOT, "scripts/test-nhim-audit-rbac-manifest.mjs")]);
run("node", [join(ROOT, "scripts/test-nhim-audit-schema-snapshot.mjs")]);
run("node", [join(ROOT, "scripts/test-nhim-audit-copy-neutral.mjs")]);

console.log("nhim-audit e2e: OK");
