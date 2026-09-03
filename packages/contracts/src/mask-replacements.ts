/**
 * Shared span replacement for Azure PII and other mask stages.
 */

export type MaskReplacement = {
  start: number;
  end: number;
  token: string;
  original: string;
};

export function applyMaskReplacements(
  originalText: string,
  replacements: MaskReplacement[]
): { maskedText: string; tokenMap: Record<string, string>; entitiesApplied: number } {
  const ordered = [...replacements].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return b.end - a.end;
  });

  const accepted: MaskReplacement[] = [];
  let lastEnd = -1;
  for (const candidate of ordered) {
    if (candidate.start < 0 || candidate.end > originalText.length) continue;
    if (candidate.start < lastEnd) continue;
    accepted.push(candidate);
    lastEnd = candidate.end;
  }

  const tokenMap: Record<string, string> = {};
  let maskedText = originalText;
  accepted
    .sort((a, b) => b.start - a.start)
    .forEach((r) => {
      maskedText = `${maskedText.slice(0, r.start)}${r.token}${maskedText.slice(r.end)}`;
      tokenMap[r.token] = r.original;
    });

  return { maskedText, tokenMap, entitiesApplied: accepted.length };
}
