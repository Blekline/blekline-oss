import * as vscode from "vscode";
import type { ShieldState } from "./config";
import { getWorkspaceToken } from "./config";
import { maskPrompt } from "./mask";

export type ShieldSetter = (state: ShieldState) => void;

function errorMarkdown(message: string, upgradeUrl?: string): string {
  const extra = upgradeUrl ? ` [Upgrade](${upgradeUrl})` : "";
  return `${message}${extra}`;
}

/**
 * @blekline chat path only. Native @copilot is not intercepted.
 * Mask the prompt, then forward masked text with request.model.sendRequest.
 */
export function registerChatParticipant(
  context: vscode.ExtensionContext,
  setShield: ShieldSetter,
): vscode.Disposable {
  const handler: vscode.ChatRequestHandler = async (request, _chatContext, stream, token) => {
    const workspaceToken = await getWorkspaceToken(context.secrets);
    if (!workspaceToken) {
      setShield("disconnected");
      stream.markdown(
        "Blekline is not connected. Run **Blekline: Setup**, then mention `@blekline` again. Native `@copilot` is not masked by this extension.",
      );
      return;
    }

    const prompt = request.prompt?.trim() ?? "";
    if (!prompt) {
      stream.markdown("Send a prompt after `@blekline`.");
      return;
    }

    if (!request.model) {
      stream.markdown(
        "Select a language model in Copilot Chat, then mention **@blekline**. This path does not intercept native `@copilot`.",
      );
      return;
    }

    setShield("scanning");
    stream.progress("Redacting before send…");

    const masked = await maskPrompt(prompt, workspaceToken);
    if (token.isCancellationRequested) {
      setShield("idle");
      return;
    }

    if (!masked.ok) {
      const billing = masked.code === "plan_limit" || masked.code === "credits_exhausted";
      setShield(billing ? "billing" : masked.code === "unauthorized" ? "disconnected" : "error");
      stream.markdown(errorMarkdown(masked.message, masked.upgradeUrl));
      return;
    }

    if (masked.blocked) {
      setShield("blocked");
      const trace = masked.requestId ? ` Trace \`${masked.requestId}\`.` : "";
      stream.markdown(
        `Blekline blocked this prompt (secrets or sensitive data).${trace} Native \`@copilot\` is not covered.`,
      );
      return;
    }

    setShield(masked.entitiesMasked > 0 ? "masked" : "idle");
    if (masked.entitiesMasked > 0 && masked.requestId) {
      stream.markdown(`_Redacted ${masked.entitiesMasked} ${masked.entitiesMasked === 1 ? "entity" : "entities"}. Trace \`${masked.requestId}\`._\n\n`);
    }

    const messages = [vscode.LanguageModelChatMessage.User(masked.maskedText)];

    try {
      const response = await request.model.sendRequest(messages, {}, token);
      for await (const fragment of response.text) {
        stream.markdown(fragment);
      }
    } catch (err) {
      if (err instanceof vscode.LanguageModelError) {
        setShield("error");
        stream.markdown(`Could not complete the model request: ${err.message}`);
        return;
      }
      setShield("error");
      throw err;
    }

    setShield("idle");
  };

  const participant = vscode.chat.createChatParticipant("blekline.blekline", handler);
  participant.iconPath = new vscode.ThemeIcon("shield");
  return participant;
}
