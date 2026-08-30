import { spawnSync } from "node:child_process";
import { scanTextForSecrets } from "@blekline/contracts";
import { buildBlockUserMessage } from "@blekline/client-hooks/notices";
import { scanPromptAttachments } from "./attachment-guard.mjs";
import { emitGovernanceEvent } from "./emit-governance.mjs";
import { localMaskRequestId, maskPromptLocally } from "./local-mask.mjs";
import {
  clearPendingMaskedPrompt,
  conversationIdFromHookInput,
  readPendingMaskedPrompt,
  workspaceRootFromHookInput,
  writePendingMaskedPrompt,
} from "./pending-mask.mjs";

const HARD_SECRET_IDS = new Set([
  "aws_access_key",
  "github_pat",
  "github_pat_fine",
  "openai_sk",
  "openai_sk_proj",
  "stripe_sk",
  "slack_token",
  "google_api_key",
  "jwt",
]);

/**
 * @param {string} text
 * @returns {import('@blekline/contracts').ScanFinding[]}
 */
export function findHardSecrets(text) {
  return scanTextForSecrets(text).filter((f) => HARD_SECRET_IDS.has(f.id));
}

/**
 * @param {string} text
 * @param {import('./config.mjs').CursorHookConfig} config
 * @returns {Promise<{ ok: true, maskedText: string, entitiesMasked: number, provider?: string, requestId?: string } | { ok: false, code: string, message: string }>}
 */
export async function maskViaApi(text, config) {
  if (!config.workspaceToken) {
    return { ok: false, code: "missing_token", message: "BLEKLINE_WORKSPACE_TOKEN is required" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.maskTimeoutMs);

  try {
    const res = await fetch(`${config.apiUrl.replace(/\/$/, "")}/api/mask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-blekline-workspace-token": config.workspaceToken,
        "x-blekline-client-surface": config.platform || "cursor",
        "x-blekline-mask-fast-path": "local_first",
      },
      body: JSON.stringify({ text, platform: "Cursor-Hook" }),
      signal: controller.signal,
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        code: typeof body.code === "string" ? body.code : `http_${res.status}`,
        message: typeof body.error === "string" ? body.error : `Mask API HTTP ${res.status}`,
      };
    }

    return {
      ok: true,
      maskedText: String(body.maskedText ?? text),
      entitiesMasked: typeof body.entitiesMasked === "number" ? body.entitiesMasked : 0,
      provider: typeof body.provider === "string" ? body.provider : undefined,
      requestId: typeof body.requestId === "string" ? body.requestId : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Mask API request failed";
    const code = err instanceof Error && err.name === "AbortError" ? "timeout" : "network_error";
    return { ok: false, code, message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {string} prompt
 * @param {import('./config.mjs').CursorHookConfig} config
 */
async function resolveMaskResult(prompt, config) {
  const localFindings = scanTextForSecrets(prompt);
  if (localFindings.length === 0) {
    return { maskedText: prompt, entitiesMasked: 0, requestId: undefined, provider: "none" };
  }

  if (config.promptMaskSource === "local") {
    const local = maskPromptLocally(prompt);
    return {
      maskedText: local.maskedText,
      entitiesMasked: local.entitiesMasked,
      requestId: localMaskRequestId(),
      provider: "fast_local",
    };
  }

  const cloud = await maskViaApi(prompt, config);
  if (cloud.ok) {
    return {
      maskedText: cloud.maskedText,
      entitiesMasked: cloud.entitiesMasked,
      requestId: cloud.requestId,
      provider: cloud.provider ?? "azure",
    };
  }

  const local = maskPromptLocally(prompt);
  return {
    maskedText: local.maskedText,
    entitiesMasked: local.entitiesMasked,
    requestId: localMaskRequestId(),
    provider: "fallback_local",
    cloudError: cloud.code,
  };
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function copyToClipboard(text) {
  try {
    if (process.platform === "darwin") {
      const proc = spawnSync("pbcopy", { input: text, encoding: "utf8" });
      return proc.status === 0;
    }
    if (process.platform === "win32") {
      const proc = spawnSync("clip", { input: text, shell: true, encoding: "utf8" });
      return proc.status === 0;
    }
    const proc = spawnSync("xclip", ["-selection", "clipboard"], { input: text, encoding: "utf8" });
    return proc.status === 0;
  } catch {
    return false;
  }
}

export { buildBlockUserMessage };

/**
 * @param {object} input
 * @param {import('./config.mjs').CursorHookConfig} config
 */
export async function runMaskPromptHook(input, config) {
  const prompt = typeof input?.prompt === "string" ? input.prompt : "";
  const conversationId = conversationIdFromHookInput(input);
  const root = workspaceRootFromHookInput();

  if (!prompt.trim()) {
    return { continue: true };
  }

  const attachmentScan = scanPromptAttachments(input?.attachments);
  if (attachmentScan.blocked) {
    emitGovernanceEvent(config, {
      kind: "cursor_prompt_governance",
      action: "block_sensitive_attachment",
      entitiesMasked: attachmentScan.paths.length,
      riskTier: "high",
    });
    return {
      continue: false,
      user_message:
        `Blekline blocked a prompt with sensitive file attachment(s): ${attachmentScan.paths.join(", ")}. ` +
        "Remove .env/key attachments or paste redacted excerpts instead.",
    };
  }

  const pending = readPendingMaskedPrompt(root, conversationId);
  if (pending && prompt.trim() === pending.maskedText.trim()) {
    clearPendingMaskedPrompt(root, conversationId);
    emitGovernanceEvent(config, {
      kind: "cursor_prompt_governance",
      action: "allow_masked_resubmit",
      entitiesMasked: pending.entitiesMasked,
      requestId: pending.requestId,
      riskTier: "low",
    });
    return { continue: true };
  }

  if (config.promptPolicy === "off") {
    return { continue: true };
  }

  const hardSecrets = findHardSecrets(prompt);

  if (config.promptPolicy === "agent") {
    if (hardSecrets.length > 0) {
      return {
        continue: false,
        user_message:
          `Blekline blocked ${hardSecrets.length} hard secret(s) locally. ` +
          "Remove API keys/tokens from chat or call blekline_mask_prompt via MCP first.",
      };
    }
    return { continue: true };
  }

  if (!config.workspaceToken && hardSecrets.length > 0) {
    return {
      continue: false,
      user_message:
        "Blekline blocked hard secrets in chat. Configure BLEKLINE_WORKSPACE_TOKEN in .blekline/cursor.json or .cursor/mcp.json, then reload Cursor.",
    };
  }

  const localFindings = scanTextForSecrets(prompt);
  if (config.promptGuardMode === "local_first" && localFindings.length === 0) {
    return { continue: true };
  }

  const maskResult = await resolveMaskResult(prompt, config);

  if (maskResult.entitiesMasked <= 0 && hardSecrets.length === 0) {
    return { continue: true };
  }

  if (maskResult.entitiesMasked <= 0 && hardSecrets.length > 0) {
    return {
      continue: false,
      user_message:
        "Blekline blocked hard secrets detected locally. Remove secrets from chat or mask via blekline_mask_prompt.",
    };
  }

  if (prompt.trim() === maskResult.maskedText.trim()) {
    emitGovernanceEvent(config, {
      kind: "cursor_prompt_governance",
      action: "allow_already_masked",
      entitiesMasked: maskResult.entitiesMasked,
      requestId: maskResult.requestId,
      riskTier: "low",
    });
    return { continue: true };
  }

  const copied =
    config.copyMaskedToClipboard && config.promptPolicy === "auto_mask"
      ? copyToClipboard(maskResult.maskedText)
      : false;

  writePendingMaskedPrompt(root, conversationId, {
    maskedText: maskResult.maskedText,
    requestId: maskResult.requestId,
    entitiesMasked: maskResult.entitiesMasked,
  });

  emitGovernanceEvent(config, {
    kind: "cursor_prompt_governance",
    action: copied ? "block_and_clipboard" : "block_and_review",
    entitiesMasked: maskResult.entitiesMasked,
    requestId: maskResult.requestId,
    riskTier: maskResult.entitiesMasked >= 3 ? "medium" : "low",
  });

  return {
    continue: false,
    user_message: buildBlockUserMessage({
      entitiesMasked: maskResult.entitiesMasked,
      requestId: maskResult.requestId,
      copied,
      showMaskedInUi: config.showMaskedInUi,
      maskedText: maskResult.maskedText,
    }),
  };
}
