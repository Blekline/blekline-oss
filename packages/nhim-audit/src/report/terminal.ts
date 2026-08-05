import chalk from "chalk";
import type { AuditReport, Finding } from "../types.js";
import { DOCS_BASE, EVIDENCE_DISCLAIMER } from "../types.js";
import { renderBriefingBox, renderHeader } from "./wordmark.js";
import { compareFindings } from "./audit.js";
import { VERSION } from "../version.js";

export interface TerminalOptions {
  plain?: boolean;
  brand?: boolean;
  wide?: boolean;
  verbose?: boolean;
  noAnim?: boolean;
  suppressVendorCta?: boolean;
}

function bar(score: number, width = 20): string {
  const filled = Math.round((score / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function severityColor(sev: string, plain: boolean): (s: string) => string {
  if (plain) return (s) => s;
  switch (sev) {
    case "CRITICAL":
      return chalk.red.bold;
    case "HIGH":
      return chalk.hex("#F59E0B");
    case "MEDIUM":
      return chalk.yellow;
    default:
      return chalk.gray;
  }
}

function renderFinding(f: Finding, plain: boolean, verbose: boolean): string[] {
  const color = severityColor(f.severity, plain);
  const lines: string[] = [];
  lines.push(color(`  ┌─ ${f.id} ─ ${f.severity} ${"─".repeat(40)}`));
  lines.push(`  │ ${f.resource}`);
  lines.push(`  │ ${f.title}`);
  if (f.subtitle) lines.push(`  │ ${f.subtitle}`);
  if (f.asi.length) lines.push(`  │ ${f.asi.join(" · ")} · ${f.evidence.toUpperCase()}`);
  if (verbose && f.discovery?.signals.length) {
    lines.push(`  │ signals: ${f.discovery.signals.slice(0, 5).join(", ")}`);
  }
  if (f.fix.commands[0]) {
    lines.push(chalk.gray(`  │ FIX ▸ ${f.fix.commands[0]}`));
  }
  lines.push(`  └${"─".repeat(72)}`);
  return lines;
}

function assuranceFooter(report: AuditReport): string[] {
  const lines: string[] = [];
  lines.push(`  staticGateStatus: ${report.score.staticGateStatus}`);
  lines.push(`  schemaVersion: ${report.schemaVersion} · profile: ${report.profile}`);
  if (report.assurance.limitations.length) {
    lines.push(`  ${report.assurance.limitations[0]}`);
    lines.push(`  ${report.assurance.limitations[4] ?? report.assurance.limitations[1]}`);
  }
  lines.push(`  ${EVIDENCE_DISCLAIMER}`);
  lines.push(`  Rule reference: ${DOCS_BASE}/tools/nhim-audit`);
  lines.push("  run with --probe (token) · --plain for CI · --json for automation");
  return lines;
}

function tieredCta(report: AuditReport): string[] {
  const band = report.score.band;
  const lines: string[] = [];
  const hasCritical = report.summary.critical > 0;
  const gateFail = report.score.staticGateStatus === "fail";

  if (hasCritical || gateFail) {
    lines.push("  ► CRITICAL bypass surfaces — remediate mandatory-hop policy before production");
  } else if (band === "AT RISK") {
    lines.push(`  ► Partial enforcement — review findings and apply NetworkPolicy fixes`);
  } else if (band === "PARTIAL") {
    lines.push("  ► Static clean — run --probe with token before shipped claims");
  } else {
    lines.push(`  ► Add CI gate: ${DOCS_BASE}/tools/nhim-audit`);
  }
  lines.push(`  ► Score band ${band} — ${report.score.controlObjective}`);
  if (report.profile === "blekline") {
    lines.push(`  ► Blekline reference: ${DOCS_BASE}/enterprise/k8s-deployment`);
  }
  return lines;
}

export function renderTerminal(report: AuditReport, opts: TerminalOptions = {}): string {
  const plain = opts.plain ?? false;
  const suppressCta = opts.suppressVendorCta ?? report.profile === "generic";
  const parts: string[] = [];

  parts.push(renderHeader({ plain, brand: opts.brand, version: VERSION }));
  if (!plain) {
    parts.push("");
    parts.push(renderBriefingBox(report.cluster, VERSION, report.profile));
  }

  parts.push("");
  parts.push(`  ◈ DISCOVER … ${report.candidates.length} agent candidates`);
  parts.push(`  ◈ ANALYZE … ${report.findings.length} findings`);
  parts.push(
    report.mode === "static+probe"
      ? "  ◈ PROBE … completed"
      : "  ◈ PROBE … skipped (requires NHIM_PROBE_TOKEN — see docs)",
  );

  parts.push("");
  const scoreColor = plain ? (s: string) => s : chalk.hex("#F59E0B");
  parts.push("┌──────────────────────────────────────────────────────────────────────────────┐");
  parts.push(
    scoreColor(
      `│  NHIM READINESS   ${String(report.score.value).padStart(3, " ")} / 100   ${bar(report.score.value)}   ${report.score.band.padEnd(10)} │`,
    ),
  );
  parts.push(`│  ${report.score.controlObjective.slice(0, 74).padEnd(74)} │`);
  parts.push("└──────────────────────────────────────────────────────────────────────────────┘");

  const critical = report.findings.filter((f) => f.severity === "CRITICAL");
  if (critical.length) {
    parts.push("");
    parts.push(`  BYPASS SURFACE (${critical.length} critical)`);
    parts.push("");
    for (const f of critical) {
      parts.push(...renderFinding(f, plain, opts.verbose ?? false));
    }
  }

  const rest = report.findings
    .filter((f) => f.severity !== "CRITICAL" && f.id !== "NHIM-012")
    .sort(compareFindings)
    .slice(0, opts.verbose ? 50 : 3);
  if (rest.length) {
    parts.push("");
    parts.push("  OTHER FINDINGS");
    for (const f of rest) {
      parts.push(...renderFinding(f, plain, opts.verbose ?? false));
    }
  }

  parts.push("");
  parts.push("  ── SUMMARY ──────────────────────────────────────────────────────────────────");
  parts.push(
    `  candidates: ${report.summary.candidates}   critical: ${report.summary.critical}   high: ${report.summary.high}   medium: ${report.summary.medium}   probed: ${report.summary.probed}`,
  );
  parts.push("");
  if (!suppressCta) {
    parts.push(...tieredCta(report));
    parts.push("");
  }
  parts.push(...assuranceFooter(report));

  return parts.join("\n");
}
