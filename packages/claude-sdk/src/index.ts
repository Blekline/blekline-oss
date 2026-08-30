import { BleklineClient, type BleklineClientOptions } from "@blekline/client";

export { BleklineClient, type BleklineClientOptions } from "@blekline/client";

/** Anthropic Messages ingress (Claude Code `ANTHROPIC_BASE_URL`). */
export function anthropicIngressBaseUrl(apiOrigin = "https://app.blekline.com"): string {
  return `${apiOrigin.replace(/\/$/, "")}/api/ingress/v1`;
}

export function claudeCodeEnv(opts?: {
  apiOrigin?: string;
  workspaceToken?: string;
}): Record<string, string> {
  const apiOrigin = opts?.apiOrigin ?? process.env.BLEKLINE_API_URL ?? "https://app.blekline.com";
  const token = opts?.workspaceToken ?? process.env.BLEKLINE_WORKSPACE_TOKEN ?? "";
  const env: Record<string, string> = {
    ANTHROPIC_BASE_URL: anthropicIngressBaseUrl(apiOrigin),
    BLEKLINE_CLIENT_SURFACE: "claude-code",
  };
  if (token) env.BLEKLINE_WORKSPACE_TOKEN = token;
  return env;
}

export function createClaudeGovernanceClient(opts: BleklineClientOptions): BleklineClient {
  return new BleklineClient({
    ...opts,
    metadata: { ...opts.metadata, clientSurface: opts.metadata?.clientSurface ?? "claude-code" },
  });
}
