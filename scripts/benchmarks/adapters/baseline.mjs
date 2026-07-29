import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "../fixtures/payloads.json");

function loadPayloads() {
  return JSON.parse(readFileSync(FIXTURES, "utf8"));
}

export const id = "baseline";
export const label = "Ungoverned baseline";

export async function runScenario(scenarioId) {
  const payloads = loadPayloads();
  switch (scenarioId) {
    case "B1":
      return {
        score: "fail",
        evidence: { echoed: true, sample: payloads.prompt_pii_secret.slice(0, 80) },
      };
    case "B2":
      return {
        score: "fail",
        evidence: { action: "allow", note: "No enforce hop" },
      };
    case "B3":
      return { score: "na", evidence: { reason: "No lineage layer" } };
    case "B4":
      return {
        score: "na",
        evidence: { p99: 0, note: "No enforce hop — zero overhead, zero protection" },
      };
    case "B5":
      return {
        score: "fail",
        evidence: { action: "allow", credentialsInArgs: true },
      };
    case "B6":
      return { score: "fail", evidence: { egressUnrestricted: true } };
    case "B7":
      return {
        score: "na",
        evidence: {
          reason: "No enforce layer — first enforced interaction never occurs",
          note: "Zero setup ≠ time to governance",
        },
      };
    case "B8":
      return { score: "fail", evidence: { points: 0, note: "No audit metadata" } };
    default:
      return { score: "na", evidence: {} };
  }
}

export async function runAll() {
  const ids = ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8"];
  const out = {};
  for (const id of ids) {
    out[id] = await runScenario(id);
  }
  return out;
}
