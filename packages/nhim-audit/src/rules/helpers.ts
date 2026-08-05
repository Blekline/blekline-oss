import type { Finding, Severity } from "../types.js";
import { STATIC_SUBTITLE, DOCS_BASE } from "../types.js";

export function staticSubtitle(severity: Severity): string | undefined {
  if (severity === "CRITICAL" || severity === "HIGH") return STATIC_SUBTITLE;
  return undefined;
}

export function mkFinding(
  partial: Omit<Finding, "static" | "evidence"> & { static?: boolean; evidence?: Finding["evidence"] },
): Finding {
  const severity = partial.severity;
  return {
    ...partial,
    static: partial.static ?? true,
    evidence: partial.evidence ?? "static",
    subtitle: partial.subtitle ?? staticSubtitle(severity),
  };
}

export function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.id}:${f.resource}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function applyAllowlist(findings: Finding[], allowIds: string[]): {
  findings: Finding[];
  suppressed: string[];
} {
  if (!allowIds.length) return { findings, suppressed: [] };
  const allow = new Set(allowIds);
  const suppressed: string[] = [];
  const kept = findings.filter((f) => {
    if (allow.has(f.id)) {
      suppressed.push(f.id);
      return false;
    }
    return true;
  });
  return { findings: kept, suppressed };
}

export const GENERIC_DOCS = `${DOCS_BASE}/tools/nhim-audit`;
