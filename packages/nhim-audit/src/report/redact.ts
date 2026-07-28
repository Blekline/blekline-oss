import type { AuditReport } from "../types.js";

/** Strip values that must never appear in JSON artifacts (env values, tokens). */
export function redactReport(report: AuditReport): AuditReport {
  return {
    ...report,
    candidates: report.candidates.map((c) => ({
      ...c,
      envKeys: c.envKeys.map((k) => k),
      signals: c.signals.filter((s) => !s.includes("=") || s.startsWith("label:") || s.startsWith("env:") || s.startsWith("image:")),
    })),
    findings: report.findings.map((f) => ({
      ...f,
      fix: {
        ...f.fix,
        commands: f.fix.commands.map((cmd) =>
          cmd.replace(/blw_eval_[A-Za-z0-9_]+/g, "blw_eval_…").replace(/blw_live_[A-Za-z0-9_]+/g, "blw_live_…"),
        ),
      },
    })),
  };
}
