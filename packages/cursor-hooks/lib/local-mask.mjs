import { randomUUID } from "node:crypto";
import { scanTextForSecrets } from "@blekline/contracts";

/**
 * Instant in-process mask (same labels as @blekline/contracts). No network.
 *
 * @param {string} text
 * @returns {{ maskedText: string, entitiesMasked: number }}
 */
export function maskPromptLocally(text) {
  const findings = scanTextForSecrets(text);
  if (findings.length === 0) {
    return { maskedText: text, entitiesMasked: 0 };
  }

  let out = text;
  let offset = 0;
  let count = 0;
  const sorted = [...findings].sort((a, b) => a.start - b.start);
  for (const f of sorted) {
    const start = f.start + offset;
    const end = f.end + offset;
    const token = `[${f.label}]`;
    out = out.slice(0, start) + token + out.slice(end);
    offset += token.length - (f.end - f.start);
    count += 1;
  }

  return { maskedText: out, entitiesMasked: count };
}

/**
 * @returns {string}
 */
export function localMaskRequestId() {
  return `local-${randomUUID().slice(0, 8)}`;
}
