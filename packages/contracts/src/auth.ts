export const WORKSPACE_TOOL_SCOPES = [
  "mask:write",
  "events:write",
  "events:read",
  "integrations:write",
] as const;

export type WorkspaceToolScope = (typeof WORKSPACE_TOOL_SCOPES)[number];

export const BLEKLINE_HEADERS = {
  workspaceToken: "x-blekline-workspace-token",
  workspaceId: "x-blekline-workspace-id",
  requestId: "x-request-id",
  clientSurface: "x-blekline-client-surface",
  modelProvider: "x-blekline-model-provider",
  modelId: "x-blekline-model-id",
} as const;

export const CLIENT_SURFACES = [
  "cursor",
  "claude-desktop",
  "claude-code",
  "codex",
  "continue",
  "github-copilot",
  "openhands",
  "sourcegraph-cody",
  "sdk",
  "extension",
  "unknown",
] as const;

export type ClientSurface = (typeof CLIENT_SURFACES)[number];

export type ModelProvider = "anthropic" | "openai" | "google" | "xai" | "cursor" | "unknown";
