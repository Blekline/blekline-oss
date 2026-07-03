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
    "# Blekline chat guard (active)",
    "",
    "This workspace uses Blekline Cursor hooks:",
    "- User prompts are cloud-masked before the model when policy is auto_mask/block.",
    "- Sensitive file attachments (.env, keys) are blocked on Send.",
    "- Shell commands and tool arguments are guarded locally; MCP calls are policy-checked.",
    "- If a prompt is blocked, paste the masked version Blekline provides.",
    "- Always call `blekline_mask_prompt` before forwarding user-supplied text with PII/secrets to tools or subagents.",
    "- Use `blekline-proxy` for downstream MCP tool governance.",
    "",
    isConfigured(config)
      ? `Control plane: ${config.apiUrl} · policy: ${config.promptPolicy}`
      : "Configure `.blekline/cursor.json` or `.cursor/mcp.json` with BLEKLINE_WORKSPACE_TOKEN, then reload Cursor.",
  ].join("\n");

  return out;
}

export { loadCursorHookConfig, isConfigured };
