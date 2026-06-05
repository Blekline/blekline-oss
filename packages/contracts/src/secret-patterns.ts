/** Portable secret/PII patterns for local fast scan (aligned with webapp detectors). */

export type SecretPattern = { id: string; label: string; pattern: RegExp };

export function buildSecretPatterns(): SecretPattern[] {
  return [
    { id: "aws_access_key", label: "AWS_KEY", pattern: /\b(?:AKIA|ASIA|AIDA|AROA|AGPA|AIPA|ANPA|ANVA|APKA|ASCA|ACCA)[A-Z0-9]{16}\b/g },
    { id: "github_pat", label: "GITHUB", pattern: /\bgh[oprus]_[A-Za-z0-9_]{36,255}\b/g },
    { id: "github_pat_fine", label: "GITHUB_FINE", pattern: /\bgithub_pat_[A-Za-z0-9_]{80,500}\b/g },
    { id: "openai_sk", label: "OPENAI", pattern: /\bsk-[A-Za-z0-9]{20,}\b/g },
    { id: "openai_sk_proj", label: "OPENAI_PROJ", pattern: /\bsk-proj-[A-Za-z0-9_-]{20,500}\b/g },
    { id: "stripe_sk", label: "STRIPE", pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,128}\b/g },
    { id: "slack_token", label: "SLACK", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,128}\b/g },
    { id: "google_api_key", label: "GOOGLE_KEY", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g },
    { id: "jwt", label: "JWT", pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g },
    { id: "email", label: "EMAIL", pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
    { id: "ssn", label: "SSN", pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
    { id: "iban", label: "IBAN", pattern: /\b[A-Z]{2}\d{2}(?:[ -]?[A-Z0-9]){11,30}\b/gi },
    { id: "card", label: "CARD", pattern: /\b(?:\d[ -]?){12,19}\b/g },
  ];
}

export type ScanFinding = {
  id: string;
  label: string;
  match: string;
  start: number;
  end: number;
};

export function scanTextForSecrets(text: string): ScanFinding[] {
  const findings: ScanFinding[] = [];
  for (const { id, label, pattern } of buildSecretPatterns()) {
    const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const match = m[0];
      if (match.includes("[") && match.includes("]")) continue;
      findings.push({ id, label, match, start: m.index, end: m.index + match.length });
    }
  }
  return findings;
}
