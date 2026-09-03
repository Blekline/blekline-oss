/**
 * Pure helpers for Azure Text Analytics PII → Blekline mask tokens.
 */

export type AzurePiiEntityLike = {
  category: string;
  confidenceScore?: number;
  offset: number;
  length: number;
  text: string;
};

export type PiiMaskReplacement = {
  start: number;
  end: number;
  token: string;
  original: string;
};

export function normalizePiiCategory(category: string): string {
  const c = category.toUpperCase();
  if (c.includes("PERSON")) return "PERSON";
  if (c.includes("LOCATION") || c.includes("ADDRESS")) return "LOCATION";
  if (c.includes("ORGANIZATION")) return "ORGANIZATION";
  if (c.includes("EMAIL")) return "EMAILADDRESS";
  if (c.includes("PHONE") || c.includes("PHONENUMBER")) return "PHONENUMBER";
  if (c.includes("DATE") || c === "DATETIME") return "DATETIME";
  if (c.includes("AGE")) return "AGE";
  if (c.includes("URL")) return "URL";
  if (c.includes("IP")) return "IPADDRESS";
  if (
    c.includes("HEALTH") ||
    c.includes("MEDICAL") ||
    c.includes("CONDITION") ||
    c.includes("DOSAGE") ||
    c.includes("TREATMENT")
  ) {
    return "HEALTH";
  }
  return c.replace(/[^A-Z0-9]+/g, "_");
}

export function countPersonEntities(entities: Array<{ category: string }>): number {
  return entities.filter((e) => normalizePiiCategory(e.category) === "PERSON").length;
}

export function filterPiiEntitiesForMasking<T extends { category: string; confidenceScore?: number }>(
  entities: T[],
  opts: { minConfidence: number | null; suppressedCategories: Set<string> }
): T[] {
  return entities.filter((entity) => {
    const category = normalizePiiCategory(entity.category);
    if (opts.suppressedCategories.has(category)) return false;
    const min = opts.minConfidence;
    if (min != null && min > 0) {
      const conf = entity.confidenceScore;
      if (typeof conf !== "number" || !Number.isFinite(conf) || conf < min) {
        return false;
      }
    }
    return true;
  });
}

export function buildPiiMaskReplacements(
  entities: AzurePiiEntityLike[],
  opts: { minConfidence: number | null; suppressedCategories: Set<string> }
): PiiMaskReplacement[] {
  const filtered = filterPiiEntitiesForMasking(entities, opts);
  const counters: Record<string, number> = {};
  return filtered.map((entity) => {
    const category = normalizePiiCategory(entity.category);
    counters[category] = (counters[category] ?? 0) + 1;
    const token = `[${category}_${String(counters[category]).padStart(2, "0")}]`;
    return {
      start: entity.offset,
      end: entity.offset + entity.length,
      token,
      original: entity.text,
    };
  });
}
