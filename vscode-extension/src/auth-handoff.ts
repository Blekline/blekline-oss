import * as vscode from "vscode";
import {
  SECRET_SESSION_TOKEN,
  SECRET_USER_ID,
  SECRET_WORKSPACE_ID,
  SECRET_WORKSPACE_TOKEN,
  getApiUrl,
  getWorkspaceToken,
} from "./config";

type HandoffPayload = {
  sessionToken?: string;
  userId?: string;
  workspaceId?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function consumeHandoff(apiUrl: string, state: string): Promise<HandoffPayload | null> {
  try {
    const res = await fetch(`${apiUrl}/api/auth/extension-handoff?state=${encodeURIComponent(state)}`);
    const body = (await res.json().catch(() => ({}))) as HandoffPayload;
    if (!res.ok || !body.sessionToken || !body.userId || !body.workspaceId) return null;
    return body;
  } catch {
    return null;
  }
}

/**
 * Same pattern as the browser extension: open `/auth/extension-link`, then
 * redeem the server-side handoff (VS Code has no `window.opener` postMessage).
 */
export async function openExtensionLinkHandoff(
  secrets: vscode.SecretStorage,
  token: vscode.CancellationToken,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const apiUrl = getApiUrl();
  const state = crypto.randomUUID();
  const openerOrigin = "vscode://blekline.blekline";
  const link = vscode.Uri.parse(
    `${apiUrl}/auth/extension-link?openerOrigin=${encodeURIComponent(openerOrigin)}&state=${encodeURIComponent(state)}`,
  );

  const opened = await vscode.env.openExternal(link);
  if (!opened) {
    return { ok: false, message: "Could not open the Blekline sign-in page." };
  }

  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    if (token.isCancellationRequested) {
      return { ok: false, message: "Setup cancelled." };
    }
    const handoff = await consumeHandoff(apiUrl, state);
    if (handoff?.sessionToken && handoff.userId && handoff.workspaceId) {
      await secrets.store(SECRET_SESSION_TOKEN, handoff.sessionToken);
      await secrets.store(SECRET_USER_ID, handoff.userId);
      await secrets.store(SECRET_WORKSPACE_ID, handoff.workspaceId);
      return { ok: true };
    }
    await sleep(1000);
  }

  return {
    ok: false,
    message: "Auth timed out. Sign-in may still have completed — paste a workspace token to continue.",
  };
}

export async function promptAndStoreWorkspaceToken(secrets: vscode.SecretStorage): Promise<boolean> {
  const existing = await getWorkspaceToken(secrets);
  const value = await vscode.window.showInputBox({
    title: "Blekline workspace token",
    prompt: "Paste a workspace token from app.blekline.com (Admin → API keys). Stored in VS Code Secret Storage.",
    placeHolder: "blw_…",
    password: true,
    ignoreFocusOut: true,
    value: existing ? undefined : "",
  });
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return Boolean(existing);
  await secrets.store(SECRET_WORKSPACE_TOKEN, trimmed);
  return true;
}

export async function runSetup(secrets: vscode.SecretStorage): Promise<boolean> {
  const handoff = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Blekline",
      cancellable: true,
    },
    async (progress, cancel) => {
      progress.report({ message: "Sign in at app.blekline.com…" });
      return openExtensionLinkHandoff(secrets, cancel);
    },
  );

  if (!handoff.ok) {
    void vscode.window.showWarningMessage(handoff.message);
  }

  const stored = await promptAndStoreWorkspaceToken(secrets);
  if (!stored) {
    void vscode.window.showWarningMessage("Blekline needs a workspace token to mask prompts.");
    return false;
  }

  void vscode.window.showInformationMessage("Blekline is connected. Use @blekline in Copilot Chat (not native @copilot).");
  return true;
}
