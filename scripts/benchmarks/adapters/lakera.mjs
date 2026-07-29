import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { secretLeakScore, auditArtifactScore } from "../score.mjs";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "../fixtures/payloads.json");

function loadPayloads() {
  return JSON.parse(readFileSync(FIXTURES, "utf8"));
}

function getApiKey() {
  return process.env.LAKERA_API_KEY?.trim();
}

async function callGuard(content) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { skipped: true, reason: "Set LAKERA_API_KEY in .env.benchmark" };
  }
  const t0 = performance.now();
  const res = await fetch("https://api.lakera.ai/v2/guard", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [{ role: "user", content }],
    }),
  });
  const elapsed = performance.now() - t0;
  if (!res.ok) {
    const body = await res.text();
    return { error: true, status: res.status, body: body.slice(0, 200), elapsedMs: elapsed };
  }
  const data = await res.json();
  return { data, elapsedMs: elapsed };
}

export const id = "lakera";
export const label = "Lakera Guard";

export async function runScenario(scenarioId) {
  const payloads = loadPayloads();
  switch (scenarioId) {
    case "B1": {
      const result = await callGuard(payloads.prompt_pii_secret);
      if (result.skipped) return { score: "skipped", evidence: result };
      if (result.error) {
        return {
          score: "partial",
          evidence: {
            ...result,
            note: "API reachable but returned error — check LAKERA_API_KEY",
          },
        };
      }
      const flagged = Boolean(result.data?.flagged ?? result.data?.results?.flagged);
      const score = flagged ? "pass" : "partial";
      return {
        score,
        evidence: {
          flagged,
          latencyMs: Number(result.elapsedMs.toFixed(1)),
          note: "Content screen — does not tokenize for model context",
        },
      };
    }
    case "B2":
      return {
        score: "na",
        evidence: { reason: "Content ML — no MCP tools/call structural enforce" },
      };
    case "B3":
      return { score: "na", evidence: { reason: "No session lineage" } };
    case "B4": {
      const result = await callGuard("benchmark latency probe");
      if (result.skipped || result.error) return { score: "skipped", evidence: result };
      return {
        score: "partial",
        evidence: {
          path: "Lakera Guard API",
          p50: Number(result.elapsedMs.toFixed(1)),
          p95: Number(result.elapsedMs.toFixed(1)),
          p99: Number(result.elapsedMs.toFixed(1)),
          unit: "ms",
          note: "Single-request sample; cloud classify path",
        },
      };
    }
    case "B5":
      return {
        score: "na",
        evidence: { reason: "Prompt/content scope — not tool-arg enforce" },
      };
    case "B6":
      return { score: "na", evidence: { reason: "Not K8s egress control" } };
    case "B7":
      return {
        score: "partial",
        evidence: { estimatedMinutes: "15–60", note: "API key + SDK integration" },
      };
    case "B8": {
      const result = await callGuard("audit probe");
      if (result.skipped || result.error) return { score: "skipped", evidence: result };
      let points = 0;
      if (result.data?.flagged !== undefined) points += 1;
      if (result.data?.breakdown) points += 1;
      if (result.data?.request_id ?? result.data?.requestId) points += 1;
      return {
        score: auditArtifactScore(points),
        evidence: { points, hasBreakdown: Boolean(result.data?.breakdown) },
      };
    }
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
