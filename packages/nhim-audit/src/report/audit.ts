import { readFileSync, writeFileSync } from "node:fs";
import type { AuditReport, Finding, Severity } from "../types.js";
import { EVIDENCE_DISCLAIMER } from "../types.js";
import type { AgentCandidate } from "../types.js";
import { calculateScore, countBySeverity } from "../score.js";
import { runStaticRules } from "../rules/engine.js";
import type { ClusterSnapshot } from "../types.js";
import type { DiscoverOptions } from "../discover/agents.js";
import { redactReport } from "./redact.js";

const VERSION = "0.1.0";

export interface AuditOptions {
  discover?: DiscoverOptions;
  probe?: boolean;
}

export function runAudit(
  cluster: ClusterSnapshot,
  options: AuditOptions = {},
): AuditReport {
  const { candidates, findings } = runStaticRules(cluster, options.discover ?? {});
  const score = calculateScore(findings);
  const summary = countBySeverity(findings);

  return {
    generator: `@blekline/nhim-audit@${VERSION}`,
    version: VERSION,
    cluster: cluster.clusterName,
    timestamp: new Date().toISOString(),
    mode: options.probe ? "static+probe" : "static",
    candidates,
    findings,
    score,
    summary: { candidates: candidates.length, ...summary },
    probeAvailable: true,
    disclaimer: EVIDENCE_DISCLAIMER,
  };
}

export function reportToJson(report: AuditReport, pretty = true): string {
  return JSON.stringify(redactReport(report), null, pretty ? 2 : 0);
}

export function writeReport(path: string, report: AuditReport): void {
  writeFileSync(path, reportToJson(report), "utf8");
}

export function readReport(path: string): AuditReport {
  return JSON.parse(readFileSync(path, "utf8")) as AuditReport;
}

const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

export function compareFindings(a: Finding, b: Finding): number {
  return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
}

export function filterFindings(
  findings: Finding[],
  opts: { minSeverity?: Severity; onlyCritical?: boolean },
): Finding[] {
  let out = findings;
  if (opts.onlyCritical) {
    out = out.filter((f) => f.severity === "CRITICAL");
  }
  if (opts.minSeverity) {
    const min = SEVERITY_ORDER[opts.minSeverity];
    out = out.filter((f) => SEVERITY_ORDER[f.severity] <= min);
  }
  return out;
}

export type FailOnLevel = "critical" | "high" | "any";

export function shouldFail(report: AuditReport, failOn: FailOnLevel): boolean {
  if (failOn === "critical") return report.summary.critical > 0;
  if (failOn === "high") return report.summary.critical + report.summary.high > 0;
  return report.findings.some((f) => f.id !== "NHIM-012" && f.severity !== "INFO");
}

export function meetsMinScore(report: AuditReport, minScore: number): boolean {
  return report.score.value >= minScore;
}

export function findingKey(f: Finding): string {
  return `${f.id}|${f.resource}|${f.namespace}`;
}

export function diffAgainstBaseline(
  current: AuditReport,
  baseline: AuditReport,
): Finding[] {
  const baseKeys = new Set(baseline.findings.map(findingKey));
  return current.findings.filter((f) => !baseKeys.has(findingKey(f)));
}
