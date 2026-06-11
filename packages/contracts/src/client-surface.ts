import { CLIENT_SURFACES, type ClientSurface } from "./auth.js";

const CLIENT_SURFACE_SET = new Set<string>(CLIENT_SURFACES);

export function isClientSurface(value: string): value is ClientSurface {
  return CLIENT_SURFACE_SET.has(value);
}

/** Parse BLEKLINE_CLIENT_SURFACE env; defaults to `sdk` when unset or unknown. */
export function parseClientSurfaceFromEnv(
  raw?: string | null,
  fallback: ClientSurface = "sdk"
): ClientSurface {
  const v = raw?.trim();
  if (v && isClientSurface(v)) return v;
  return fallback;
}
