import { scanTextForSecrets } from "@blekline/contracts";
import { isSensitivePath } from "./sensitive-paths.mjs";
import { findHardSecrets } from "./mask-prompt-hook.mjs";

const SENSITIVE_SHELL_CMD_RE =
  /\b(?:cat|type|head|tail|less|more|bat|Get-Content)\s+[^\s|;&]+(?:\.env(?:\.|$)|\.pem|id_rsa|credentials)\b/i;

const GREP_SECRETS_RE = /\bgrep(?:\s+-[^\s]+)*\s+[^\s|;&]*(?:\.env|\.pem|id_rsa|credentials|secrets)/i;

/**
 * @param {string} command
 * @returns {boolean}
 */
function commandTargetsSensitiveFile(command) {
  if (!command) return false;
  if (SENSITIVE_SHELL_CMD_RE.test(command)) return true;
  if (GREP_SECRETS_RE.test(command)) return true;

  const pathMatch = command.match(/(?:^|\s)([^\s|;&"'`]+)/g) ?? [];
  for (const token of pathMatch) {
    const cleaned = token.trim().replace(/^['"]|['"]$/g, "");
    if (isSensitivePath(cleaned)) return true;
  }
  return false;
}

/**
 * @param {object} input
 * @param {import('./config.mjs').CursorHookConfig} config
 */
export function runBeforeShellExecutionHook(input, config) {
  if (!config.shellGuard) {
    return { permission: "allow" };
  }

  const command = typeof input?.command === "string" ? input.command.trim() : "";
  if (!command) {
    return { permission: "allow" };
  }

  if (commandTargetsSensitiveFile(command)) {
    return {
      permission: "deny",
      user_message:
        "Blekline blocked a shell command that reads sensitive files (.env, keys, credentials). Use masked excerpts instead.",
      agent_message:
        "Shell command blocked by Blekline: do not read .env, keys, or credential files via terminal. Use blekline_mask_prompt on redacted excerpts.",
    };
  }

  const secrets = findHardSecrets(command);
  if (secrets.length > 0) {
    return {
      permission: "deny",
      user_message: `Blekline blocked a shell command containing ${secrets.length} hard secret(s). Remove tokens/keys from commands.`,
      agent_message:
        "Shell command blocked: hard secrets detected in command string. Remove API keys and tokens before retrying.",
    };
  }

  if (config.shellGuardMode === "cloud") {
    const soft = scanTextForSecrets(command);
    if (soft.length > 0) {
      return {
        permission: "deny",
        user_message: `Blekline blocked a shell command with ${soft.length} sensitive pattern(s).`,
        agent_message: "Shell command blocked: sensitive patterns in command. Redact before retrying.",
      };
    }
  }

  return { permission: "allow" };
}
