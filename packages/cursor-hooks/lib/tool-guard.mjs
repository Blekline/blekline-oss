import { scanTextForSecrets } from "@blekline/contracts";
import { isSensitivePath } from "./sensitive-paths.mjs";
import { maskPromptLocally } from "./local-mask.mjs";
import { runBeforeShellExecutionHook } from "./shell-guard.mjs";

/**
 * @param {string} toolName
 * @returns {boolean}
 */
function isReadTool(toolName) {
  return /^read$/i.test(toolName) || /^read_file$/i.test(toolName);
}

/**
 * @param {string} toolName
 * @returns {boolean}
 */
function isWriteTool(toolName) {
  return /^write$/i.test(toolName) || /^write_file$/i.test(toolName) || /^edit$/i.test(toolName);
}

/**
 * @param {string} toolName
 * @returns {boolean}
 */
function isShellTool(toolName) {
  return /^shell$/i.test(toolName) || /^run_terminal_cmd$/i.test(toolName);
}

/**
 * @param {Record<string, unknown>} toolInput
 * @returns {string}
 */
function extractReadPath(toolInput) {
  for (const key of ["file_path", "path", "target_file", "filePath"]) {
    const v = toolInput[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/**
 * @param {Record<string, unknown>} toolInput
 * @returns {string}
 */
function extractWriteContent(toolInput) {
  for (const key of ["content", "contents", "new_string", "text", "body"]) {
    const v = toolInput[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

/**
 * Locally mask secret patterns in a string (same token labels as contracts).
 *
 * @param {string} text
 * @returns {{ text: string, count: number }}
 */
function maskStringLocally(text) {
  const { maskedText, entitiesMasked } = maskPromptLocally(text);
  return { text: maskedText, count: entitiesMasked };
}

/**
 * @param {object} input
 * @param {import('./config.mjs').CursorHookConfig} config
 */
export function runPreToolUseHook(input, config) {
  if (!config.toolGuard) {
    return { permission: "allow" };
  }

  const toolName = typeof input?.tool_name === "string" ? input.tool_name : "";
  const toolInput =
    input?.tool_input && typeof input.tool_input === "object" && !Array.isArray(input.tool_input)
      ? /** @type {Record<string, unknown>} */ (input.tool_input)
      : {};

  if (!toolName) {
    return { permission: "allow" };
  }

  if (isReadTool(toolName)) {
    const path = extractReadPath(toolInput);
    if (path && isSensitivePath(path)) {
      return {
        permission: "deny",
        user_message:
          "Blekline blocked Read on a sensitive file path (.env, keys, secrets). Use blekline_mask_prompt on redacted excerpts.",
        agent_message:
          "Tool Read blocked: sensitive path. Do not read .env or key files directly; mask excerpts via blekline_mask_prompt.",
      };
    }
  }

  if (isShellTool(toolName)) {
    const command =
      typeof toolInput.command === "string"
        ? toolInput.command
        : typeof toolInput.cmd === "string"
          ? toolInput.cmd
          : "";
    if (command) {
      return runBeforeShellExecutionHook({ command }, config);
    }
  }

  if (isWriteTool(toolName)) {
    const content = extractWriteContent(toolInput);
    if (!content) {
      return { permission: "allow" };
    }
    const masked = maskStringLocally(content);
    if (masked.count <= 0) {
      return { permission: "allow" };
    }
    const updatedInput = { ...toolInput };
    for (const key of ["content", "contents", "new_string", "text", "body"]) {
      if (typeof updatedInput[key] === "string") {
        updatedInput[key] = masked.text;
        break;
      }
    }
    return {
      permission: "allow",
      updated_input: updatedInput,
      agent_message: `Blekline redacted ${masked.count} sensitive entit${masked.count === 1 ? "y" : "ies"} in Write content before execution.`,
    };
  }

  return { permission: "allow" };
}
