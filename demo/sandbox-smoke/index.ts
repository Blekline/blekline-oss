/**
 * Multi-provider L1 sandbox smoke test.
 *
 * Creates a provider sandbox (or verifies credentials), runs Blekline mask,
 * asserts no raw PII in output, tears down.
 *
 * Usage:
 *   SANDBOX_PROVIDER=daytona pnpm demo:sandbox-smoke
 *
 * Required env (all providers):
 *   BLEKLINE_WORKSPACE_TOKEN
 *   BLEKLINE_API_URL (optional, default https://app.blekline.com)
 *
 * Provider-specific env — see demo/README.md
 */

import { resolveProvider } from "./providers/index.js";
import { runProviderSmoke } from "./shared.js";

const providerId = (process.env.SANDBOX_PROVIDER ?? "daytona").trim().toLowerCase();

runProviderSmoke(resolveProvider(providerId)).catch((err) => {
  console.error(err);
  process.exit(1);
});
