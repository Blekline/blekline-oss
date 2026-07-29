#!/usr/bin/env node
/**
 * Publish benchmark results to webapp/public/marketing/benchmarks/
 * and regenerate Webflow embed HTML from latest.json.
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  existsSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scoreLabel, scoreCssClass } from "./score.mjs";

const BENCH_DIR = join(dirname(fileURLToPath(import.meta.url)));
const ROOT = join(BENCH_DIR, "../..");
const RESULTS = join(BENCH_DIR, "results", "latest.json");
const OUT = join(ROOT, "webapp/public/marketing/benchmarks");
const BENCH_CSS_URL =
  "https://app.blekline.com/marketing/benchmarks/benchmarks-webflow.css?v=8";
const BENCH_CSS_HEAD = `<!-- Load once in Webflow Site Head: ${BENCH_CSS_URL} -->`;

const SYSTEM_LABELS = {
  blekline: "Blekline",
  baseline: "Ungoverned",
  lakera: "Lakera Guard",
  kong: "Kong AI GW",
  onecli: "OneCLI",
};

function loadReport() {
  if (!existsSync(RESULTS)) {
    throw new Error(`No results at ${RESULTS}. Run pnpm benchmark:run first.`);
  }
  return JSON.parse(readFileSync(RESULTS, "utf8"));
}

function chip(score) {
  const cls = scoreCssClass(score);
  return `<span class="bl-bench-chip ${cls}">${scoreLabel(score)}</span>`;
}

function generateMatrixEmbed(report) {
  const systems = report.adapters;
  const scenarios = Object.values(report.scenarios);

  let header = `<th class="bl-bench-accent bl-bench-sticky-col">Scenario</th>`;
  for (const sys of systems) {
    header += `<th class="bl-bench-muted">${SYSTEM_LABELS[sys] ?? sys}</th>`;
  }

  let rows = "";
  for (const s of scenarios) {
    rows += `<tr><td class="bl-bench-sticky-col"><span class="bl-bench-scenario-title">${s.id}</span><span class="bl-bench-scenario-sub">${s.title}</span></td>`;
    for (const sys of systems) {
      const r = s.results?.[sys];
      rows += `<td>${r ? chip(r.score) : chip("na")}</td>`;
    }
    rows += "</tr>";
  }

  return `<!-- Webflow Code Embed: Benchmark matrix -->
${BENCH_CSS_HEAD}
<div class="bl-bench-root">
  <p class="bl-bench-meta">Lab run ${report.runAt.slice(0, 10)} · git ${report.gitSha} · mode ${report.mode}</p>
  <p class="bl-bench-scroll-hint">Swipe to compare vendors</p>
  <div class="bl-bench-scroll-shell">
    <div class="bl-bench-table-wrap" tabindex="0" role="region" aria-label="Benchmark comparison matrix">
      <table class="bl-bench-table">
        <thead><tr>${header}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>
  <p class="bl-bench-footer">Full methodology &amp; reproduce commands → <a href="https://app.blekline.com/docs/reference/benchmarks">app.blekline.com/docs/reference/benchmarks</a></p>
</div>`;
}

function generateScenariosEmbed(report) {
  const scenarios = Object.values(report.scenarios);
  let cards = "";
  for (const s of scenarios) {
    let results = "";
    for (const [sys, r] of Object.entries(s.results ?? {})) {
      results += `<div class="bl-bench-card-row"><span class="bl-bench-card-row-label">${SYSTEM_LABELS[sys] ?? sys}</span>${chip(r.score)}</div>`;
    }
    cards += `<div class="bl-bench-card"><div class="bl-bench-card-id">${s.id}</div><div class="bl-bench-card-title">${s.title}</div><p class="bl-bench-card-q">${s.question}</p>${results}</div>`;
  }
  return `<!-- Webflow Code Embed: Benchmark scenario cards -->
${BENCH_CSS_HEAD}
<div class="bl-bench-root">
  <div class="bl-bench-cards">${cards}</div>
  <p class="bl-bench-footer">Full methodology → <a href="https://app.blekline.com/docs/reference/benchmarks">docs/reference/benchmarks</a></p>
</div>`;
}

function generateLatencyEmbed(report) {
  const b4 = report.scenarios?.B4;
  if (!b4) return "<!-- No B4 latency data -->";

  const entries = [];
  for (const [sys, r] of Object.entries(b4.results ?? {})) {
    const p99 = r.evidence?.p99 ?? r.evidence?.p50 ?? 0;
    if (typeof p99 === "number" && p99 > 0) {
      entries.push({ sys, p99, label: SYSTEM_LABELS[sys] ?? sys });
    }
  }
  entries.sort((a, b) => a.p99 - b.p99);
  const max = Math.max(...entries.map((e) => e.p99), 10);

  let bars = "";
  for (const e of entries) {
    const rawPct = (e.p99 / max) * 100;
    const pct = Math.min(100, Math.max(e.p99 > 0 ? 3 : 0, rawPct));
    bars += `<div class="bl-bench-latency-bar"><span class="bl-bench-latency-label">${e.label}</span><div class="bl-bench-latency-track"><div class="bl-bench-latency-fill" style="width:${pct.toFixed(0)}%"></div></div><span class="bl-bench-latency-val">${e.p99} ms</span></div>`;
  }

  return `<!-- Webflow Code Embed: Benchmark latency (B4) -->
${BENCH_CSS_HEAD}
<div class="bl-bench-root">
  <p class="bl-bench-heading">Enforce latency (B4)</p>
  <p class="bl-bench-meta">p99 on canonical payload · Blekline target &lt;10ms local enforce</p>
  <div class="bl-bench-latency-panel">
  ${bars}
  </div>
  <p class="bl-bench-footer">Methodology → <a href="https://app.blekline.com/docs/reference/benchmarks">docs/reference/benchmarks</a></p>
</div>`;
}

function generateMethodologyEmbed(report) {
  return `<!-- Webflow Code Embed: Benchmark methodology summary -->
${BENCH_CSS_HEAD}
<div class="bl-bench-root">
  <p class="bl-bench-heading">How we benchmark</p>
  <p style="color:#c4c4c4;margin:12px 0">Identical payloads across every system. Pass = blocked or masked before execution. Partial = detected but not structurally enforced. Fail = payload reached execution context.</p>
  <ul style="color:#a3a3a3;font-size:13px;padding-left:20px;margin:0">
    <li>8 scenarios (B1–B8) aligned to NHIM buyer questions</li>
    <li>Raw JSON artifact with git SHA and version pins</li>
    <li>Honest N/A where products operate at different layers</li>
  </ul>
  <p class="bl-bench-meta" style="margin-top:12px">Last run: ${report.runAt.slice(0, 10)} · ${report.mode} mode</p>
  <p class="bl-bench-footer"><a href="https://app.blekline.com/docs/reference/benchmarks">Full methodology &amp; reproduce commands →</a></p>
</div>`;
}

function main() {
  const report = loadReport();
  mkdirSync(OUT, { recursive: true });

  copyFileSync(RESULTS, join(OUT, "latest.json"));

  const cssSrc = join(OUT, "benchmarks-webflow.css");
  if (!existsSync(cssSrc)) {
    throw new Error(`Missing ${cssSrc} — maintain benchmarks-webflow.css in repo before publish.`);
  }

  writeFileSync(join(OUT, "benchmark-matrix-webflow-embed.html"), generateMatrixEmbed(report));
  writeFileSync(join(OUT, "benchmark-scenarios-webflow-embed.html"), generateScenariosEmbed(report));
  writeFileSync(join(OUT, "benchmark-latency-webflow-embed.html"), generateLatencyEmbed(report));
  writeFileSync(
    join(OUT, "benchmark-methodology-webflow-embed.html"),
    generateMethodologyEmbed(report),
  );

  console.log(`Published to ${OUT}`);
}

main();
