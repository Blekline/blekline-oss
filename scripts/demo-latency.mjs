#!/usr/bin/env node
/**
 * Benchmark Blekline ingress latency paths.
 * Usage:
 *   pnpm demo:latency
 *   BLEKLINE_API_URL=http://localhost:3000 BLEKLINE_WORKSPACE_TOKEN=blw_... pnpm demo:latency
 */
import { performance } from "node:perf_hooks";
import { enforceToolCallLocally } from "../packages/contracts/dist/enforce-local.js";

const token = process.env.BLEKLINE_WORKSPACE_TOKEN?.trim();
const baseUrl = (process.env.BLEKLINE_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
const sample =
  "Contact John Smith at john@acme.com, SSN 123-45-6789, key AKIAIOSFODNN7EXAMPLE";

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

async function benchLocalEnforce(iterations = 500) {
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    enforceToolCallLocally({
      toolName: "run_shell",
      arguments: { cmd: `export AWS_KEY=AKIAIOSFODNN7EXAMPLE iter=${i}` },
      requestId: `bench-${i}`,
    });
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  return {
    path: "local enforce-tool-call (contracts)",
    iterations,
    p50: percentile(times, 50).toFixed(2),
    p95: percentile(times, 95).toFixed(2),
    p99: percentile(times, 99).toFixed(2),
    unit: "ms",
  };
}

async function benchMaskApi(mode) {
  if (!token) {
    return { path: `POST /api/mask (${mode})`, skipped: true, reason: "Set BLEKLINE_WORKSPACE_TOKEN" };
  }
  const headers = {
    "Content-Type": "application/json",
    "x-blekline-workspace-token": token,
    "x-blekline-client-surface": "sdk",
  };
  if (mode !== "default") {
    headers["x-blekline-mask-fast-path"] = mode;
  }
  const times = [];
  let maskPath = null;
  let latencyHeader = null;
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    const res = await fetch(`${baseUrl}/api/mask`, {
      method: "POST",
      headers,
      body: JSON.stringify({ text: sample, platform: "Latency-Bench" }),
    });
    const elapsed = performance.now() - t0;
    times.push(elapsed);
    maskPath = res.headers.get("x-blekline-mask-path") ?? maskPath;
    latencyHeader = res.headers.get("x-blekline-latency-ms") ?? latencyHeader;
    if (!res.ok) {
      const body = await res.text();
      return { path: `POST /api/mask (${mode})`, error: body.slice(0, 200), status: res.status };
    }
  }
  times.sort((a, b) => a - b);
  return {
    path: `POST /api/mask (${mode})`,
    maskPath,
    serverLatencyMs: latencyHeader,
    p50: percentile(times, 50).toFixed(0),
    p95: percentile(times, 95).toFixed(0),
    unit: "ms",
    target: mode === "local_only" ? "p95 < 20ms" : "p95 < 500ms (Azure)",
  };
}

async function benchHealth() {
  const t0 = performance.now();
  const res = await fetch(`${baseUrl}/api/health`);
  const ms = performance.now() - t0;
  const body = await res.json().catch(() => ({}));
  return { path: "GET /api/health", ok: res.ok, ms: ms.toFixed(1), body };
}

async function benchIngressHealth() {
  const t0 = performance.now();
  const res = await fetch(`${baseUrl}/api/health/ingress`);
  const ms = performance.now() - t0;
  const body = await res.json().catch(() => ({}));
  return { path: "GET /api/health/ingress", ok: res.ok, ms: ms.toFixed(1), body };
}

console.log("Blekline ingress latency benchmark\n");
console.log(JSON.stringify(await benchHealth(), null, 2));
console.log(JSON.stringify(await benchIngressHealth(), null, 2));
console.log(JSON.stringify(await benchLocalEnforce(), null, 2));
console.log(JSON.stringify(await benchMaskApi("default"), null, 2));
if (token) {
  console.log("\nTip: set BLEKLINE_MASK_FAST_PATH=local_first on server and re-run for faster mask path.");
}
