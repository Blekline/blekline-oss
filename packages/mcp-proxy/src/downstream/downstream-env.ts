/** Keys safe to pass to an untrusted downstream MCP child process. */
const DOWNSTREAM_ENV_ALLOWLIST = new Set([
  "PATH",
  "HOME",
  "USER",
  "LOGNAME",
  "SHELL",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "TERM",
  "TMPDIR",
  "TEMP",
  "TMP",
  "NODE_OPTIONS",
  "NODE_PATH",
  "PYTHONPATH",
  "PYTHONHOME",
  "VIRTUAL_ENV",
  "UV_RUN_RECIPES",
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
  "XDG_CACHE_HOME",
]);

/** Never forward Blekline or cloud credentials to downstream MCP servers. */
const DOWNSTREAM_ENV_DENYLIST = new Set([
  "BLEKLINE_WORKSPACE_TOKEN",
  "BLEKLINE_SIDECAR_AUTH",
  "BLEKLINE_API_URL",
  "BLEKLINE_WORKSPACE_ID",
  "BLEKLINE_MCP_REGISTRY_JSON",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
  "AWS_PROFILE",
  "GITHUB_TOKEN",
  "GH_TOKEN",
  "NPM_TOKEN",
  "KUBECONFIG",
  "DATABASE_URL",
  "DIRECT_URL",
  "STRIPE_SECRET_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
]);

/**
 * Builds a minimal environment for downstream MCP stdio transports.
 * Downstream servers must not inherit workspace tokens or CI secrets.
 */
export function buildDownstreamEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of DOWNSTREAM_ENV_ALLOWLIST) {
    const value = process.env[key];
    if (typeof value === "string" && value.length > 0) {
      env[key] = value;
    }
  }

  const extraJson = process.env.BLEKLINE_DOWNSTREAM_ENV_JSON?.trim();
  if (extraJson) {
    try {
      const parsed = JSON.parse(extraJson) as Record<string, unknown>;
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof key !== "string" || DOWNSTREAM_ENV_DENYLIST.has(key)) continue;
        if (typeof value === "string") env[key] = value;
      }
    } catch {
      /* ignore malformed operator override */
    }
  }

  return env;
}
