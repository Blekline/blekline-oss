import { NOTICE_CURSOR_NO_SILENT_AUTO_SEND, NOTICE_SESSION_GUARD_LINES } from "@blekline/client-hooks/notices";
import { isConfigured, loadCursorHookConfig } from "./config.mjs";

/**
 * @param {object} _input
 * @param {import('./config.mjs').CursorHookConfig} config
 */
export function runSessionStartHook(_input, config) {
  const out = {};

  if (isConfigured(config)) {
    out.env = {
      BLEKLINE_API_URL: config.apiUrl,
      BLEKLINE_WORKSPACE_TOKEN: config.workspaceToken,
      BLEKLINE_CLIENT_SURFACE: config.platform || "cursor",
    };
  }

  out.additional_context = [
    ...NOTICE_SESSION_GUARD_LINES,
    NOTICE_CURSOR_NO_SILENT_AUTO_SEND,
    "",
    isConfigured(config)
      ? `Control plane: ${config.apiUrl} · policy: ${config.promptPolicy}`
      : "Configure `.blekline/cursor.json` or `.cursor/mcp.json` with BLEKLINE_WORKSPACE_TOKEN, then reload Cursor.",
  ].join("\n");

  return out;
}

export { loadCursorHookConfig, isConfigured };
