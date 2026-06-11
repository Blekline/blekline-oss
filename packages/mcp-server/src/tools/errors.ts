/** MCP tool error shape returned to Claude (never bare Internal Server Error). */
export type McpToolErrorBody = {
  ok: false;
  code: string;
  message: string;
  retryable: boolean;
};

export function mcpToolError(code: string, message: string, retryable = false): McpToolErrorBody {
  return { ok: false, code, message, retryable };
}

export function formatToolError(err: unknown): McpToolErrorBody {
  if (err && typeof err === "object" && "status" in err) {
    const status = (err as { status?: number }).status;
    if (status === 401) return mcpToolError("unauthorized", "Invalid or expired workspace credentials.", false);
    if (status === 403) return mcpToolError("forbidden", "Plan or billing does not allow this operation.", false);
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
