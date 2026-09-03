import { reAwsAccessKeyId } from "./enterprise-patterns.js";

/** Portable regex rules for discovery-style masking (subset of detector pack v1). */
export const DISCOVERY_REGEX_RULES: Array<{ id: string; pattern: RegExp }> = [
  { id: "cc_pan", pattern: /\b(?:\d[ -]*?){13,19}\b/g },
  { id: "email", pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { id: "ssn_us", pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  { id: "phone_us", pattern: /\b(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
  { id: "iban", pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b/g },
  { id: "swift_bic", pattern: /\b[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/g },
  { id: "ipv4", pattern: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g },
  { id: "mac_address", pattern: /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g },
  { id: "aws_access_key", pattern: reAwsAccessKeyId() },
];

function ruleIdToTokenLabel(ruleId: string): string {
  return `DETECTOR_${ruleId.replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase()}`;
}

export function applyDiscoveryRegexMasks(text: string): {
  maskedText: string;
  tokenMap: Record<string, string>;
  entitiesMasked: number;
} {
  type Span = { start: number; end: number; ruleId: string };
  const findings: Span[] = [];

  for (const rule of DISCOVERY_REGEX_RULES) {
    const re = new RegExp(rule.pattern.source, rule.pattern.flags.includes("g") ? rule.pattern.flags : `${rule.pattern.flags}g`);
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    let matchCount = 0;
    while ((m = re.exec(text)) !== null && matchCount < 50 && findings.length < 200) {
      matchCount += 1;
      const raw = m[0];
      if (raw.includes("[") || raw.includes("]")) {
        if (raw.length === 0) re.lastIndex += 1;
        continue;
      }
      findings.push({ start: m.index, end: m.index + raw.length, ruleId: rule.id });
      if (raw.length === 0) re.lastIndex += 1;
    }
  }

  findings.sort((a, b) => (a.start !== b.start ? a.start - b.start : b.end - b.start - (a.end - a.start)));

  const kept: Span[] = [];
  let lastEnd = -1;
  for (const f of findings) {
    if (f.start < lastEnd) continue;
    kept.push(f);
    lastEnd = f.end;
  }

  const counters: Record<string, number> = {};
  const tokenMap: Record<string, string> = {};
  let maskedText = text;
  kept
    .slice()
    .reverse()
    .forEach((span) => {
      const label = ruleIdToTokenLabel(span.ruleId);
      counters[label] = (counters[label] ?? 0) + 1;
      const token = `[${label}_${String(counters[label]).padStart(3, "0")}]`;
      const original = maskedText.slice(span.start, span.end);
      tokenMap[token] = original;
      maskedText = maskedText.slice(0, span.start) + token + maskedText.slice(span.end);
    });

  return { maskedText, tokenMap, entitiesMasked: kept.length };
}
