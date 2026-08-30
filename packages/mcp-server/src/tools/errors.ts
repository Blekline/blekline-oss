/** MCP tool error shape returned to Claude (never bare Internal Server Error). */
export type McpToolErrorBody = {
  ok: false;
  code: string;
  message: string;
  retryable: boolean;
  upgradeUrl?: string;
};

const DEFAULT_UPGRADE = "https://app.blekline.com/admin/settings/billing";

export function mcpToolError(
  code: string,
  message: string,
  retryable = false,
  extra?: { upgradeUrl?: string }
): McpToolErrorBody {
  return { ok: false, code, message, retryable, ...extra };
}

export function formatToolError(err: unknown): McpToolErrorBody {
  if (err && typeof err === "object" && "status" in err) {
    const status = (err as { status?: number }).status;
    const body = err as { code?: string; error?: string };
    if (status === 401) return mcpToolError("unauthorized", "Invalid or expired workspace credentials.", false);
    if (status === 403) {
      const code = body.code === "billing_required" || body.code === "credits_exhausted" ? body.code : "plan_limit";
      return mcpToolError(
        code,
        typeof body.error === "string" ? body.error : "Plan or billing does not allow this operation.",
        false,
        { upgradeUrl: DEFAULT_UPGRADE }
      );
    }
    if (status === 429) return mcpToolError("rate_limited", "Rate limit exceeded. Retry later.", true);
  }
  const message = err instanceof Error ? err.message : "Request failed.";
  return mcpToolError("upstream_error", message, true);
}

export function toolTextResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function toolErrorResult(body: McpToolErrorBody) {
  return toolTextResult(body);
}
