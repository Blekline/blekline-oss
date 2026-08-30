import * as vscode from "vscode";
import { runSetup } from "./auth-handoff";
import { registerChatParticipant } from "./chat-participant";
import {
  SECRET_WORKSPACE_TOKEN,
  activityUrl,
  getWorkspaceToken,
  shieldLabel,
  shieldStatusText,
  type ShieldState,
} from "./config";
import { maskPrompt } from "./mask";
import { registerMcpContributor } from "./mcp-contributor";

let shieldItem: vscode.StatusBarItem | undefined;
let shieldState: ShieldState = "disconnected";
let idleTimer: ReturnType<typeof setTimeout> | undefined;

function setShield(state: ShieldState): void {
  shieldState = state;
  if (!shieldItem) return;
  shieldItem.text = shieldStatusText(state);
  shieldItem.tooltip = `Blekline — ${shieldLabel(state)}\n@blekline path only; native @copilot is not intercepted.`;
  shieldItem.command = state === "disconnected" ? "blekline.setup" : "blekline.openActivity";

  if (idleTimer) clearTimeout(idleTimer);
  if (state === "masked" || state === "blocked") {
    idleTimer = setTimeout(() => {
      if (shieldState === "masked" || shieldState === "blocked") {
        setShield("idle");
      }
    }, 4000);
  }
}

async function refreshConnection(secrets: vscode.SecretStorage): Promise<void> {
  const token = await getWorkspaceToken(secrets);
  setShield(token ? "idle" : "disconnected");
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  shieldItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  shieldItem.name = "Blekline";
  context.subscriptions.push(shieldItem);
  shieldItem.show();
  await refreshConnection(context.secrets);

  context.subscriptions.push(
    vscode.commands.registerCommand("blekline.setup", async () => {
      const ok = await runSetup(context.secrets);
      await refreshConnection(context.secrets);
      if (ok) setShield("idle");
    }),
    vscode.commands.registerCommand("blekline.verify", async () => {
      const token = await getWorkspaceToken(context.secrets);
      if (!token) {
        setShield("disconnected");
        const pick = await vscode.window.showWarningMessage(
          "Blekline is not connected. Run Setup to store a workspace token.",
          "Setup",
        );
        if (pick === "Setup") await vscode.commands.executeCommand("blekline.setup");
        return;
      }
      setShield("scanning");
      const result = await maskPrompt("Blekline verification ping", token);
      if (!result.ok) {
        const billing = result.code === "plan_limit" || result.code === "credits_exhausted";
        setShield(billing ? "billing" : result.code === "unauthorized" ? "disconnected" : "error");
        void vscode.window.showErrorMessage(result.message);
        return;
      }
      setShield("idle");
      void vscode.window.showInformationMessage(
        "Blekline verify OK. Use @blekline in Copilot Chat — native @copilot is not masked.",
      );
    }),
    vscode.commands.registerCommand("blekline.openActivity", async () => {
      await vscode.env.openExternal(vscode.Uri.parse(activityUrl()));
    }),
    registerChatParticipant(context, setShield),
  );

  const mcp = registerMcpContributor(context);
  context.subscriptions.push(mcp);

  context.subscriptions.push(
    context.secrets.onDidChange(async (event) => {
      if (event.key === SECRET_WORKSPACE_TOKEN) await refreshConnection(context.secrets);
    }),
  );
}

export function deactivate(): void {
  if (idleTimer) clearTimeout(idleTimer);
  shieldItem?.dispose();
}
