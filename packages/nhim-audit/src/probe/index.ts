import type { AuditReport, ClusterSnapshot } from "../types.js";
import { calculateScore, countBySeverity } from "../score.js";
import { runProbeSuite, type ProbeOptions } from "./probes.js";

const DEFAULT_VALIDATE_URL = "https://app.blekline.com/api/eval/nhim-probe/validate";

export interface ValidateOptions {
  online?: boolean;
  validateUrl?: string;
}

/** Validate eval token for --probe (prefix + optional online check). */
export async function validateEvalToken(
  token: string,
  options: ValidateOptions = {},
): Promise<{ valid: boolean; reason?: string }> {
  if (!token || token.trim().length === 0) {
    return { valid: false, reason: "BLEKLINE_EVAL_TOKEN is required for --probe" };
  }

  const t = token.trim();
  if (t.startsWith("blw_live_")) {
    return { valid: false, reason: "Use BLEKLINE_EVAL_TOKEN (blw_eval_…), not workspace live token" };
  }

  const offlineValid =
    (t.startsWith("blw_eval_") && t.length >= 16) || t.split(".").length === 3;

  if (!offlineValid) {
    return {
      valid: false,
      reason: "Invalid eval token format. Request at app.blekline.com/docs/tools/nhim-audit#probe-access",
    };
  }

  const useOnline =
    options.online ||
    process.env.BLEKLINE_EVAL_ONLINE === "1" ||
    process.env.BLEKLINE_EVAL_ONLINE === "true";

  if (!useOnline) {
    return { valid: true };
  }

  const url = options.validateUrl ?? process.env.BLEKLINE_EVAL_VALIDATE_URL ?? DEFAULT_VALIDATE_URL;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: t }),
    });
    const body = (await res.json()) as { valid?: boolean; reason?: string };
    if (body.valid) return { valid: true };
    return { valid: false, reason: body.reason ?? "Online token validation failed" };
  } catch {
    // Offline fallback when validate endpoint unreachable
    return { valid: true };
  }
}

export function probeSkippedMessage(): string {
  return [
    "◈ PROBE … skipped — requires BLEKLINE_EVAL_TOKEN",
    "► Static findings above are architectural inference only.",
    "► Request free eval token: https://app.blekline.com/docs/tools/nhim-audit#probe-access",
    "► Or email enterprise@blekline.com with nhim-audit.json attached",
  ].join("\n");
}

export async function runProbes(
  report: AuditReport,
  cluster: ClusterSnapshot,
  token: string,
  options: Omit<ProbeOptions, "token"> = {},
): Promise<AuditReport> {
  const probeFindings = await runProbeSuite(cluster, report.candidates, { ...options, token });
  const findings = [...report.findings, ...probeFindings];
  const score = calculateScore(findings);
  const summary = countBySeverity(findings);

  return {
    ...report,
    mode: "static+probe",
    findings,
    score,
    summary: { candidates: report.candidates.length, ...summary },
  };
}
