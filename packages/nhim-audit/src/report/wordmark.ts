export const GLYPH_5x5 = {
  B: ["███  ", "█  █ ", "███  ", "█  █ ", "███  "],
  L: ["█    ", "█    ", "█    ", "█    ", "███  "],
  E: ["███  ", "█    ", "██   ", "█    ", "███  "],
  K: ["█  █ ", "█ █  ", "██   ", "█ █  ", "█  █ "],
  I: ["███  ", " █   ", " █   ", " █   ", "███  "],
  N: ["█  █ ", "██ █ ", "█ ██ ", "█  █ ", "█  █ "],
} as const;

export type WordmarkLetter = keyof typeof GLYPH_5x5;

export interface RenderOptions {
  gap?: number;
  plain?: boolean;
  brand?: boolean;
  version?: string;
}

export function renderWordmark(text: string, opts: RenderOptions = {}): string[] {
  const gap = opts.gap ?? 2;
  const letters = text.split("") as WordmarkLetter[];
  const rows = 5;
  const lines: string[] = [];

  for (let row = 0; row < rows; row++) {
    const parts: string[] = [];
    for (const letter of letters) {
      const glyph = GLYPH_5x5[letter];
      if (!glyph) continue;
      parts.push(glyph[row] ?? "");
    }
    lines.push(parts.join(" ".repeat(gap)));
  }
  return lines;
}

export function renderHeader(opts: RenderOptions = {}): string {
  const version = opts.version ?? "0.1.0";
  if (opts.plain) {
    return `BLEKLINE nhim-audit v${version}`;
  }

  const block = renderWordmark("BLEKLINE", opts).map((l) => `      ${l}`);
  const sublines: string[] = [`                        nhim-audit · v${version}`];

  if (opts.brand) {
    sublines.unshift("");
    sublines.unshift("                      NHIM AUDIT · agent execution path");
    sublines.push("                        ───────────────────");
  }

  return [...block, "", ...sublines].join("\n");
}

export function renderBriefingBox(cluster: string, version: string): string {
  const top = "╔══════════════════════════════════════════════════════════════════════════════╗";
  const mid = `║  NHIM EVAL · AGENT EXECUTION PATH · READ-ONLY · v${version.padEnd(28)}║`;
  const ctx = `║  cluster ${cluster.slice(0, 58).padEnd(58)} ║`;
  const bot = "╚══════════════════════════════════════════════════════════════════════════════╝";
  return [top, mid, ctx, bot].join("\n");
}
