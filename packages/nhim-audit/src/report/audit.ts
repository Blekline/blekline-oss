import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import type { AuditConfig } from "../config/profile.js";
import { configFingerprint } from "../config/load.js";
import type { AuditReport, AssuranceBlock, Finding, Severity } from "../types.js";
import { ASSURANCE_LIMITATIONS, EVIDENCE_DISCLAIMER } from "../types.js";
import type { AgentCandidate } from "../types.js";
import { calculateScore, countBySeverity } from "../score.js";
import { runStaticRules } from "../rules/engine.js";
import type { ClusterSnapshot } from "../types.js";
import type { DiscoverOptions } from "../discover/agents.js";
import { redactReport } from "./redact.js";
import { VERSION } from "../version.js";

export interface AuditOptions {
  config: AuditConfig;
  discover?: DiscoverOptions;
  probe?: boolean;
  probeTokenPresent?: boolean;
}

function buildAssurance(probeExecuted: boolean): AssuranceBlock {
  return {
    notCertification: true,
    staticOnly: !probeExecuted,
    probeExecuted,
    limitations: [...ASSURANCE_LIMITATIONS],
  };
}

function reportSha256(report: Omit<AuditReport, "reportIntegrity">): string {
  const payload = JSON.stringify({
    findings: report.findings,
    candidates: report.candidates,
    score: report.score,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function runAudit(
  cluster: ClusterSnapshot,
  options: AuditOptions,
): AuditReport {
  const { candidates, findings, suppressedFindings } = runStaticRules(
    cluster,
    options.config,
    options.discover ?? {},
  );
  const probeExecuted = options.probe === true;
  const score = calculateScore(findings, candidates.length, probeExecuted);
  const summary = countBySeverity(findings);
  const clusterLabel = options.config.output.clusterAlias ?? cluster.clusterName;

  const base: Omit<AuditReport, "reportIntegrity"> = {
    generator: `@blekline/nhim-audit@${VERSION}`,
    version: VERSION,
    schemaVersion: "2.0",
    profile: options.config.profile,
    scoringVersion: 2,
    configFingerprint: configFingerprint(options.config),
    cluster: clusterLabel,
    timestamp: new Date().toISOString(),
    mode: probeExecuted ? "static+probe" : "static",
    candidates,
    findings,
    suppressedFindings: suppressedFindings.length ? suppressedFindings : undefined,
    score,
    summary: { candidates: candidates.length, ...summary },
    assurance: buildAssurance(probeExecuted),
    probeAvailable: Boolean(options.probeTokenPresent),
    disclaimer: EVIDENCE_DISCLAIMER,
  };

  return {
    ...base,
    reportIntegrity: { sha256: reportSha256(base) },
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
