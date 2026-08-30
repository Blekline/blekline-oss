import * as vscode from "vscode";

export const DEFAULT_API_URL = "https://app.blekline.com";
export const CLIENT_SURFACE = "github-copilot";
export const MASK_PLATFORM = "VS Code";

export const SECRET_WORKSPACE_TOKEN = "blekline.workspaceToken";
export const SECRET_SESSION_TOKEN = "blekline.sessionToken";
export const SECRET_WORKSPACE_ID = "blekline.workspaceId";
export const SECRET_USER_ID = "blekline.userId";

export type ShieldState =
  | "disconnected"
  | "idle"
  | "scanning"
  | "masked"
  | "blocked"
  | "error"
  | "billing";

export function getApiUrl(): string {
  const fromEnv = process.env.BLEKLINE_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return DEFAULT_API_URL;
}

export function activityUrl(): string {
  return `${getApiUrl()}/operations/activity`;
}

export function shieldLabel(state: ShieldState): string {
  switch (state) {
    case "disconnected":
      return "Connect Blekline";
    case "idle":
      return "Protected";
    case "scanning":
      return "Checking…";
    case "masked":
      return "Redacted";
    case "blocked":
      return "Blocked";
    case "error":
      return "Couldn’t reach Blekline";
    case "billing":
      return "Plan limit";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function shieldStatusText(state: ShieldState): string {
  switch (state) {
    case "scanning":
      return "$(sync~spin) Blekline";
    case "blocked":
      return "$(shield) Blocked";
    case "error":
    case "billing":
      return "$(shield) Blekline";
    case "disconnected":
      return "$(shield) Blekline";
    case "idle":
    case "masked":
      return "$(shield) Blekline";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export async function getWorkspaceToken(secrets: vscode.SecretStorage): Promise<string> {
  return (await secrets.get(SECRET_WORKSPACE_TOKEN))?.trim() ?? "";
}
