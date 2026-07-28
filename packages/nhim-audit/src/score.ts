import type { Finding, RedTeamPhase0, ScoreBand, ScoreResult } from "./types.js";
import { SEVERITY_WEIGHT } from "./spec/rules.js";

const BAND_OBJECTIVES: Record<ScoreBand, string> = {
  CRITICAL: "Mandatory hop not enforced — agent candidates can reach tools/LLM without sidecar path",
  "AT RISK": "Partial enforcement — bypass surfaces remain",
  PARTIAL: "Static architecture clean — probe or pentest required for shipped claims",
  HARDENED: "Static clean — probe recommended for full mandatory-hop evidence",
};

function bandForScore(value: number): ScoreBand {
  if (value <= 39) return "CRITICAL";
  if (value <= 69) return "AT RISK";
  if (value <= 89) return "PARTIAL";
  return "HARDENED";
}

function redTeamPhase0(band: ScoreBand, criticalCount: number): RedTeamPhase0 {
  if (criticalCount > 0 || band === "CRITICAL") return "fail";
  if (band === "HARDENED" || band === "PARTIAL") return "pass";
  if (band === "AT RISK") return "unknown";
  return "fail";
}

export function calculateScore(findings: Finding[]): ScoreResult {
  let value = 100;
  let criticalCount = 0;

  for (const f of findings) {
    if (f.id === "NHIM-012") continue;
    value -= SEVERITY_WEIGHT[f.severity];
    if (f.severity === "CRITICAL") criticalCount += 1;
  }

  value = Math.max(0, Math.min(100, value));
  const band = bandForScore(value);

  return {
    value,
    band,
    controlObjective: BAND_OBJECTIVES[band],
    redTeamPhase0: redTeamPhase0(band, criticalCount),
  };
}

export function countBySeverity(findings: Finding[]) {
  return {
    critical: findings.filter((f) => f.severity === "CRITICAL").length,
    high: findings.filter((f) => f.severity === "HIGH").length,
    medium: findings.filter((f) => f.severity === "MEDIUM").length,
    low: findings.filter((f) => f.severity === "LOW").length,
    info: findings.filter((f) => f.severity === "INFO").length,
    probed: findings.filter((f) => f.evidence === "probed").length,
  };
}
