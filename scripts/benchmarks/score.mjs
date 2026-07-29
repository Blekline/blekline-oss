/**
 * Normalize benchmark outcomes to Pass / Partial / Fail / N-A.
 */

/** @typedef {'pass' | 'partial' | 'fail' | 'na' | 'skipped'} BenchmarkScore */

/**
 * @param {BenchmarkScore} score
 * @returns {string}
 */
export function scoreLabel(score) {
  switch (score) {
    case "pass":
      return "Pass";
    case "partial":
      return "Partial";
    case "fail":
      return "Fail";
    case "na":
      return "N/A";
    case "skipped":
      return "Skipped";
    default:
      return "Unknown";
  }
}

/**
 * @param {BenchmarkScore} score
 * @returns {string}
 */
export function scoreCssClass(score) {
  switch (score) {
    case "pass":
      return "bl-bench-pass";
    case "partial":
      return "bl-bench-partial";
    case "fail":
      return "bl-bench-fail";
    case "na":
      return "bl-bench-na";
    case "skipped":
      return "bl-bench-na";
    default:
      return "bl-bench-na";
  }
}

/**
 * Audit artifact quality 0–3 → pass/partial/fail.
 * @param {number} points
 * @returns {BenchmarkScore}
 */
export function auditArtifactScore(points) {
  if (points >= 3) return "pass";
  if (points >= 1) return "partial";
  return "fail";
}

/**
 * Latency comparison vs Blekline local enforce SLO (p99 < 10ms reference).
 * @param {number | null} p99Ms
 * @returns {BenchmarkScore}
 */
export function latencyScore(p99Ms) {
  if (p99Ms == null || Number.isNaN(p99Ms)) return "na";
  if (p99Ms <= 10) return "pass";
  if (p99Ms <= 100) return "partial";
  return "fail";
}

/**
 * Secret still present in text after processing → fail; masked/removed → pass.
 * @param {string} output
 * @param {string[]} secretPatterns
 * @returns {BenchmarkScore}
 */
export function secretLeakScore(output, secretPatterns) {
  if (!output) return "fail";
  const leaked = secretPatterns.some((p) => output.includes(p));
  return leaked ? "fail" : "pass";
}

/**
 * Tool enforce action → pass if block, partial if mask, fail if allow on destructive.
 * @param {string | undefined} action
 * @param {{ expectBlock?: boolean }} opts
 * @returns {BenchmarkScore}
 */
export function enforceActionScore(action, opts = {}) {
  if (!action) return "na";
  if (action === "block") return "pass";
  if (action === "mask") return opts.expectBlock ? "partial" : "pass";
  if (action === "allow") return opts.expectBlock ? "fail" : "pass";
  return "na";
}
