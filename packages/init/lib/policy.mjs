import {
  applyMaskBackendToPolicy,
  maskBackendFromEntryPath,
  parseMaskBackend,
} from "../../client-hooks/lib/mask-backend.mjs";

export function defaultPolicyJson(opts = {}) {
  const fromPath = opts.entryPath ? maskBackendFromEntryPath(opts.entryPath) : null;
  const backend =
    parseMaskBackend(opts.maskBackend) ?? fromPath ?? parseMaskBackend(process.env.BLEKLINE_MASK_BACKEND) ?? "local";

  return applyMaskBackendToPolicy(
    {
    version: 1,
    apiUrl: "https://app.blekline.com",
    workspaceToken: "blw_replace_with_workspace_token",
    promptPolicy: "auto_mask",
    surfaces: {
      cursor: {
        nativeChat: "block_and_clipboard",
        silentAutoSend: false,
      },
      codex: {
        nativeChat: "block",
        silentAutoSend: "ingress_responses",
      },
      claude: {
        nativeChat: "mcp_mask",
        silentAutoSend: "ingress_responses",
      },
    },
  },
    backend
  );
}
