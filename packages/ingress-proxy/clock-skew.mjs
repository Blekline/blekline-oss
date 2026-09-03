/**
 * Warn when sidecar clock drifts from control plane — JWT-SVID exp and vault TTL depend on NTP.
 */

const DEFAULT_MAX_SKEW_MS = 30_000;

/**
 * @param {{ target: string; log: { warn: (msg: string, detail?: unknown) => void }; maxSkewMs?: number }} opts
 */
export async function warnClockSkewIfNeeded(opts) {
  const maxSkewMs = opts.maxSkewMs ?? Number(process.env.BLEKLINE_CLOCK_SKEW_WARN_MS || DEFAULT_MAX_SKEW_MS);
  if (!Number.isFinite(maxSkewMs) || maxSkewMs <= 0) return;

  try {
    const resp = await fetch(`${opts.target.replace(/\/$/, "")}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return;

    const body = await resp.json();
    const serverMs = Date.parse(typeof body?.now === "string" ? body.now : "");
    if (!Number.isFinite(serverMs)) return;

    const skewMs = Math.abs(Date.now() - serverMs);
    if (skewMs > maxSkewMs) {
      opts.log.warn("clock_skew_detected", {
        skewMs,
        maxSkewMs,
        hint: "Sync NTP on the node — JWT-SVID expiry and vault TTL require accurate time",
      });
    }
  } catch {
    /* air-gap or offline — skip */
  }
}
