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
  const version = opts.version ?? "0.2.0";
  if (opts.plain) {
    return opts.brand ? `BLEKLINE nhim-audit v${version}` : `NHIM AUDIT v${version}`;
  }

  if (opts.brand) {
    const block = renderWordmark("BLEKLINE", opts).map((l) => `      ${l}`);
    return [
      ...block,
      "",
      "                      NHIM AUDIT · agent execution path",
      `                        nhim-audit · v${version}`,
      "                        ───────────────────",
    ].join("\n");
  }

  return [
    "",
    `  NHIM AUDIT v${version}`,
    "  Agent execution path audit · Kubernetes",
    "",
  ].join("\n");
}

export function renderBriefingBox(cluster: string, version: string, profile?: string): string {
  const profileLabel = profile ? ` · ${profile}` : "";
  const top = "╔══════════════════════════════════════════════════════════════════════════════╗";
  const mid = `║  NHIM AUDIT · READ-ONLY STATIC SCAN · v${version.padEnd(26)}║`;
  const ctx = `║  cluster ${cluster.slice(0, 50).padEnd(50)} profile ${(profile ?? "generic").slice(0, 6).padEnd(6)} ║`;
  const bot = "╚══════════════════════════════════════════════════════════════════════════════╝";
  void profileLabel;
  return [top, mid, ctx, bot].join("\n");
}
