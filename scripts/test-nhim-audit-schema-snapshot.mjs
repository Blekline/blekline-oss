#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PKG = join(ROOT, "packages/nhim-audit");
const EXPECTED_DIR = join(PKG, "fixtures/expected");
const EXPECTED = join(EXPECTED_DIR, "report-generic-fixed-0.2.0.json");

function stripVolatile(report) {
  const clone = structuredClone(report);
  clone.timestamp = "TIMESTAMP";
  if (clone.reportIntegrity) clone.reportIntegrity.sha256 = "SHA256";
  if (clone.configFingerprint) clone.configFingerprint = "FINGERPRINT";
  return clone;
}

const gen = spawnSync(
  "node",
  ["dist/cli.js", "audit", "--fixture", "fixed-generic", "--json"],
  { cwd: PKG, encoding: "utf8" },
);
if (gen.status !== 0) {
  console.error(gen.stderr);
  process.exit(1);
}

const report = stripVolatile(JSON.parse(gen.stdout));

if (!existsSync(EXPECTED_DIR)) mkdirSync(EXPECTED_DIR, { recursive: true });

if (!existsSync(EXPECTED)) {
  writeFileSync(EXPECTED, JSON.stringify(report, null, 2) + "\n");
  console.log("Created golden snapshot:", EXPECTED);
  process.exit(0);
}

const expected = JSON.parse(readFileSync(EXPECTED, "utf8"));
const keys = ["schemaVersion", "profile", "mode", "score", "assurance"];
for (const key of keys) {
  const a = JSON.stringify(report[key]);
  const b = JSON.stringify(expected[key]);
  if (a !== b) {
    console.error(`schema snapshot mismatch on ${key}`);
    console.error("got:", a);
    console.error("expected:", b);
    process.exit(1);
  }
}

if (report.assurance.limitations.length < 5) {
  console.error("assurance.limitations must have >= 5 entries");
  process.exit(1);
}

console.log("Schema snapshot OK");
