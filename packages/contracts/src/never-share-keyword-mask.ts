import { normalizeMaskInput } from "./normalize-mask-input.js";

function findPhraseInText(text: string, phrase: string): { start: number; end: number } | null {
  const normalized = normalizeMaskInput(text).toLowerCase();
  const needle = normalizeMaskInput(phrase).toLowerCase();
  const idx = normalized.indexOf(needle);
  if (idx < 0) return null;
  return { start: idx, end: idx + phrase.length };
}

export function applyNeverShareKeywords(
  input: string,
  keywords: string[],
  mode: "substring" | "phrase"
): { text: string; entitiesMasked: number } {
  const cleaned = keywords.map((k) => k.trim()).filter(Boolean).slice(0, 100);
  if (cleaned.length === 0) return { text: input, entitiesMasked: 0 };

  if (mode === "phrase") {
    let out = normalizeMaskInput(input);
    let idx = 1;
    let count = 0;
    for (const keyword of cleaned) {
      while (true) {
        const hit = findPhraseInText(out, keyword);
        if (!hit) break;
        const token = `[CUSTOM_${String(idx++).padStart(2, "0")}]`;
        out = `${out.slice(0, hit.start)}${token}${out.slice(hit.end)}`;
        count += 1;
      }
    }
    return { text: out, entitiesMasked: count };
  }

  let out = input;
  let idx = 1;
  let count = 0;
  for (const keyword of cleaned) {
    const value = keyword.trim();
    if (!value) continue;
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(escaped, "gi");
    out = out.replace(rx, () => {
      count += 1;
      return `[CUSTOM_${String(idx++).padStart(2, "0")}]`;
    });
  }
  return { text: out, entitiesMasked: count };
}
