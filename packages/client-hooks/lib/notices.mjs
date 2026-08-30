/** Clipboard paste after a native Cursor chat block (no in-place rewrite). */
export const NOTICE_CLIPBOARD_PASTE =
  "Safe version is on your clipboard — press Cmd+V (Mac) or Ctrl+V, then Enter to send.";

/** Shown when clipboard copy failed. */
export const NOTICE_PASTE_FROM_MASK_RESULT =
  "Paste the safe version from your Blekline mask result, then send.";

/**
 * Honest Cursor limitation: beforeSubmitPrompt cannot rewrite the compose box.
 * Do not claim silent auto-send on native Cursor chat.
 */
export const NOTICE_CURSOR_NO_SILENT_AUTO_SEND =
  "Native Cursor chat is block + clipboard paste — not silent auto-send. Cursor cannot rewrite the prompt in place.";

/**
 * Codex native hooks can block or add context. Silent auto-send is ingress on Responses.
 */
export const NOTICE_CODEX_INGRESS_AUTO_SEND =
  "Silent auto-send for Codex uses Blekline ingress on the OpenAI Responses API. Native Codex hooks block or add context; they do not rewrite the user prompt in place.";

export const NOTICE_SESSION_GUARD_LINES = [
  "# Blekline chat guard (active)",
  "",
  "This workspace uses Blekline hooks:",
  "- User prompts are masked before the model when policy is auto_mask/block.",
  "- Sensitive file attachments (.env, keys) are blocked on Send.",
  "- Shell commands and tool arguments are guarded locally; MCP calls are policy-checked.",
  "- If a prompt is blocked, paste the masked version Blekline provides (clipboard). Do not reconstruct secrets.",
  "- Always call `blekline_mask_prompt` before forwarding user-supplied text with PII/secrets to tools or subagents.",
  "- Use `blekline-proxy` for downstream MCP tool governance.",
];

/**
 * @param {object} params
 * @param {number} params.entitiesMasked
 * @param {string | undefined} params.requestId
 * @param {boolean} params.copied
 * @param {boolean} params.showMaskedInUi
 * @param {string} params.maskedText
 */
export function buildBlockUserMessage({ entitiesMasked, requestId, copied, showMaskedInUi, maskedText }) {
  const entityLabel = `${entitiesMasked} entit${entitiesMasked === 1 ? "y" : "ies"}`;
  const trace = requestId
    ? ` Trace ID: ${requestId.slice(0, 8)}… (Activity log).`
    : " See workspace Activity for audit metadata.";

  if (showMaskedInUi) {
    const pasteHint = copied
      ? " Safe version copied to clipboard — Cmd+V then Enter."
      : " Replace your message with the safe version below, then send.";
    return `Blekline masked ${entityLabel}.${pasteHint}${trace}\n\n${maskedText}`;
  }

  if (copied) {
    return (
      `Blekline masked ${entityLabel} and blocked the raw prompt.${trace} ` + NOTICE_CLIPBOARD_PASTE
    );
  }

  return `Blekline masked ${entityLabel} and blocked the raw prompt.${trace} ` + NOTICE_PASTE_FROM_MASK_RESULT;
}
