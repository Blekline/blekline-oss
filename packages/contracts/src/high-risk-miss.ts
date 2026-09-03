import {
  reAwsAccessKeyId,
  reGithubClassicPat,
  reGithubFineGrainedPat,
  reGoogleApiKey,
  reJwtBlob,
  reOpenAiSk,
  reOpenAiSkProj,
  reSlackToken,
  reStripeSecretKey,
} from "./enterprise-patterns.js";

const HIGH_RISK: Array<{ id: string; pattern: RegExp }> = [
  { id: "aws_access_key", pattern: reAwsAccessKeyId() },
  { id: "github_pat", pattern: reGithubClassicPat() },
  { id: "github_pat_fine", pattern: reGithubFineGrainedPat() },
  { id: "openai_sk", pattern: reOpenAiSk() },
  { id: "openai_sk_proj", pattern: reOpenAiSkProj() },
  { id: "stripe_sk", pattern: reStripeSecretKey() },
  { id: "slack_token", pattern: reSlackToken() },
  { id: "google_api_key", pattern: reGoogleApiKey() },
  { id: "jwt", pattern: reJwtBlob() },
];

export function findHighRiskLiteralsStillPresent(original: string, masked: string): string[] {
  const missed: string[] = [];
  for (const { id, pattern } of HIGH_RISK) {
    const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    let m: RegExpExecArray | null;
    while ((m = re.exec(original)) !== null) {
      const literal = m[0];
      if (literal.length < 8) continue;
      if (masked.includes(literal)) {
        missed.push(id);
        break;
      }
    }
  }
  return missed;
}

export function needsAuthoritativePii(original: string, afterLocal: string): boolean {
  if (/\b(patient|dr\.|doctor|mr\.|mrs\.|ms\.)\s+[A-Z]/i.test(original)) return true;
  if (/[A-Z][a-z]+\s+[A-Z][a-z]{2,}/.test(original) && !/\[[A-Z]+_\d+\]/.test(afterLocal)) {
    return true;
  }
  return findHighRiskLiteralsStillPresent(original, afterLocal).length > 0;
}
