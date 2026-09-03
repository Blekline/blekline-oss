/** Anti-evasion normalization applied before scan and mask pipelines. */

const ZERO_WIDTH_AND_BIDI = /[\u200B-\u200D\u2060\uFEFF\u202A-\u202E\u2066-\u2069]/g;
const UNICODE_SPACES = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g;

function unwrapCodeFenceDelimiters(text: string): string {
  return text.replace(/^```[^\n]*\n/gm, "").replace(/^```\s*$/gm, "");
}

export function normalizeMaskInput(text: string): string {
  let out = text.normalize("NFKC");
  out = out.replace(ZERO_WIDTH_AND_BIDI, "");
  out = out.replace(UNICODE_SPACES, " ");
  out = out.replace(/\r\n/g, "\n");
  out = unwrapCodeFenceDelimiters(out);
  return out;
}
