import type { AuditConfig } from "../config/profile.js";
import { matchesSecretName } from "../config/match.js";
import type { AuditReport, ClusterSnapshot } from "../types.js";
import { ASSURANCE_LIMITATIONS, EVIDENCE_DISCLAIMER } from "../types.js";
import { calculateScore, countBySeverity } from "../score.js";
import { runProbeSuite, type ProbeOptions } from "./probes.js";

const DEFAULT_VALIDATE_URL = "https://app.blekline.com/api/eval/nhim-probe/validate";

export interface ValidateOptions {
  online?: boolean;
  validateUrl?: string;
  profile?: "generic" | "blekline";
}

export function resolveProbeToken(cliToken?: string): string | undefined {
  const t =
    cliToken?.trim() ||
    process.env.NHIM_PROBE_TOKEN?.trim() ||
    process.env.BLEKLINE_EVAL_TOKEN?.trim();
  return t || undefined;
}

/** Validate probe token for --probe (prefix + optional online check). */
export async function validateEvalToken(
  token: string,
  options: ValidateOptions = {},
): Promise<{ valid: boolean; reason?: string; validatedOnline?: boolean }> {
  if (!token || token.trim().length === 0) {
    return {
      valid: false,
      reason: "NHIM_PROBE_TOKEN (or BLEKLINE_EVAL_TOKEN) is required for --probe",
    };
  }

  const t = token.trim();
  if (t.startsWith("blw_live_")) {
    return { valid: false, reason: "Use NHIM_PROBE_TOKEN (blw_eval_…), not workspace live token" };
  }

  const offlineValid = t.startsWith("blw_eval_") && t.length >= 16;

  if (!offlineValid) {
    return {
      valid: false,
      reason: "Invalid probe token format. See app.blekline.com/docs/tools/nhim-audit#probe-access",
    };
  }

  const useOnline =
    options.online ||
    process.env.BLEKLINE_EVAL_ONLINE === "1" ||
    process.env.BLEKLINE_EVAL_ONLINE === "true";

  if (!useOnline) {
    return { valid: true, validatedOnline: false };
  }

  const url = options.validateUrl ?? process.env.BLEKLINE_EVAL_VALIDATE_URL ?? DEFAULT_VALIDATE_URL;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: t }),
    });
    const body = (await res.json()) as { valid?: boolean; reason?: string };
    if (body.valid) return { valid: true, validatedOnline: true };
    return { valid: false, reason: body.reason ?? "Online token validation failed" };
  } catch {
    return {
      valid: false,
      reason: "Online token validation unreachable — set BLEKLINE_EVAL_ONLINE=0 for offline eval only",
    };
  }
}

export function probeSkippedMessage(profile: "generic" | "blekline" = "generic"): string {
  const lines = [
    "◈ PROBE … skipped — requires NHIM_PROBE_TOKEN",
    "► Static findings above are architectural inference only.",
    "► Issue probe token in Deployment Hub: https://app.blekline.com/operations/posture",
    "► Docs: https://app.blekline.com/docs/tools/nhim-audit#probe-access",
  ];
  if (profile === "blekline") {
    lines.push("► Blekline eval: attach nhim-audit.json when requesting token");
  }
  return lines.join("\n");
}

function buildAssurance(probeExecuted: boolean, probeTokenValidatedOnline = false) {
  return {
    notCertification: true as const,
    staticOnly: !probeExecuted,
    probeExecuted,
    ...(probeTokenValidatedOnline ? { probeTokenValidatedOnline: true } : {}),
    limitations: [...ASSURANCE_LIMITATIONS],
  };
}

export async function runProbes(
  report: AuditReport,
  cluster: ClusterSnapshot,
  token: string,
  options: Omit<ProbeOptions, "token"> & {
    config?: AuditConfig;
    validatedOnline?: boolean;
  } = {},
): Promise<AuditReport> {
  const config = options.config;
  const probeFindings = await runProbeSuite(cluster, report.candidates, {
    ...options,
    token,
    config,
  });
  const findings = [...report.findings, ...probeFindings];
  const score = calculateScore(findings, report.candidates.length, true);
  const summary = countBySeverity(findings);

  return {
    ...report,
    mode: "static+probe",
    findings,
    score,
    summary: { candidates: report.candidates.length, ...summary },
    assurance: buildAssurance(true, options.validatedOnline === true),
    disclaimer: EVIDENCE_DISCLAIMER,
  };
}

export { matchesSecretName };
