/** @typedef {'local' | 'hosted' | 'sidecar'} MaskBackend */

/** @typedef {'local' | 'hosted' | 'fleet' | 'in_vpc'} EntryPathShell */

/**
 * @param {string | null | undefined} raw
 * @returns {MaskBackend | null}
 */
export function parseMaskBackend(raw) {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (v === "local" || v === "hosted" || v === "sidecar") return v;
  return null;
}

/**
 * Maps app workspace shells to mask backend.
 * @param {EntryPathShell | string | null | undefined} entryPath
 * @returns {MaskBackend}
 */
export function maskBackendFromEntryPath(entryPath) {
  const v = String(entryPath ?? "")
    .trim()
    .toLowerCase();
  if (v === "hosted") return "hosted";
  if (v === "fleet" || v === "in_vpc" || v === "enterprise") return "sidecar";
  return "local";
}

/**
 * Cursor hook fields derived from mask backend (double-governance).
 * @param {MaskBackend} backend
 * @param {{ apiUrl?: string; sidecarUrl?: string }} [opts]
 */
export function cursorHookFieldsForMaskBackend(backend, opts = {}) {
  const sidecarUrl =
    String(opts.sidecarUrl ?? process.env.BLEKLINE_SIDECAR_URL ?? "").trim() || undefined;
  switch (backend) {
    case "hosted":
      return {
        maskBackend: "hosted",
        promptMaskSource: "cloud",
        promptGuardMode: "always",
        apiUrl: opts.apiUrl ?? "https://app.blekline.com",
      };
    case "sidecar":
      return {
        maskBackend: "sidecar",
        promptMaskSource: "sidecar",
        promptGuardMode: "always",
        ...(sidecarUrl ? { sidecarUrl, apiUrl: sidecarUrl } : {}),
      };
    default:
      return {
        maskBackend: "local",
        promptMaskSource: "local",
      };
  }
}

/**
 * @param {Record<string, unknown>} cursorJson
 * @param {MaskBackend} backend
 * @param {{ apiUrl?: string; sidecarUrl?: string }} [opts]
 */
export function applyMaskBackendToCursorJson(cursorJson, backend, opts = {}) {
  return {
    ...cursorJson,
    ...cursorHookFieldsForMaskBackend(backend, {
      apiUrl: typeof cursorJson.apiUrl === "string" ? cursorJson.apiUrl : opts.apiUrl,
      sidecarUrl: opts.sidecarUrl,
    }),
  };
}

/**
 * @param {Record<string, unknown>} policy
 * @param {MaskBackend} backend
 */
export function applyMaskBackendToPolicy(policy, backend) {
  return { ...policy, maskBackend: backend };
}
