import {
  applyMaskBackendToPolicy,
  maskBackendFromEntryPath,
  parseMaskBackend,
} from "../../client-hooks/lib/mask-backend.mjs";

const BANKING_AGENT_PRESET = {
  preset: "banking-agent",
  policyPackId: "banking-agent-v1",
  policyPackVersion: "1.0.0",
  enforcementStage: "audit",
  maskLanguages: ["en", "de", "sl", "hr"],
};

export function defaultPolicyJson(opts = {}) {
  const fromPath = opts.entryPath ? maskBackendFromEntryPath(opts.entryPath) : null;
  const backend =
    parseMaskBackend(opts.maskBackend) ?? fromPath ?? parseMaskBackend(process.env.BLEKLINE_MASK_BACKEND) ?? "local";

  const base =
    opts.preset === "banking-agent"
      ? {
          version: 1,
          apiUrl: "https://app.blekline.com",
          workspaceToken: "blw_replace_with_workspace_token",
          promptPolicy: "auto_mask",
          entryPath: opts.entryPath ?? "fleet",
          ...BANKING_AGENT_PRESET,
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
        }
      : {
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
        };

  return applyMaskBackendToPolicy(base, backend);
}

export function bankingAgentImportHint(apiUrl = "https://app.blekline.com") {
  return [
    "Import banking policy pack (admin API):",
    `  curl -X POST ${apiUrl}/api/workspace/policy-pack/apply \\`,
    '    -H "Authorization: Bearer $BLEKLINE_WORKSPACE_TOKEN" \\',
    '    -H "Content-Type: application/json" \\',
    '    -d \'{"packId":"banking-agent-v1"}\'',
  ].join("\n");
}
