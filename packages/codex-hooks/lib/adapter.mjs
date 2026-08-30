import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NOTICE_CODEX_INGRESS_AUTO_SEND } from "@blekline/client-hooks/notices";
import { findWorkspaceRoot, loadCursorHookConfig } from "@blekline/cursor-hooks/config";
import { runAfterShellExecutionHook } from "@blekline/cursor-hooks/after-shell";
import { runBeforeReadFileHook } from "@blekline/cursor-hooks/before-read-file";
import { runBeforeMcpExecutionHook } from "@blekline/cursor-hooks/mcp-guard";
import { runMaskPromptHook } from "@blekline/cursor-hooks/mask-prompt";
import { runBeforeShellExecutionHook } from "@blekline/cursor-hooks/shell-guard";
import { runSessionStartHook } from "@blekline/cursor-hooks/session-start";
import { runPreToolUseHook } from "@blekline/cursor-hooks/tool-guard";

/**
 * @returns {import('@blekline/cursor-hooks/config').CursorHookConfig}
 */
export function loadCodexHookConfig() {
  const config = loadCursorHookConfig();
  const root = findWorkspaceRoot();
  const path = join(root, ".blekline", "codex.json");
  let extra = {};
  if (existsSync(path)) {
    try {
      extra = JSON.parse(readFileSync(path, "utf8"));
    } catch {
      extra = {};
    }
  }
  return { ...config, ...extra, platform: extra.platform || "codex" };
}

/**
 * @param {object} input
 * @returns {string}
 */
export function resolveEventName(input, argvHint = "") {
  const fromArg = String(argvHint || "").trim();
  if (fromArg) return fromArg;
  const fromInput = typeof input?.hook_event_name === "string" ? input.hook_event_name.trim() : "";
  return fromInput;
}

function toolName(input) {
  return typeof input?.tool_name === "string" ? input.tool_name : "";
}

function toolInput(input) {
  return input?.tool_input && typeof input.tool_input === "object" && !Array.isArray(input.tool_input)
    ? input.tool_input
    : {};
}

function commandFromToolInput(ti) {
  if (typeof ti.command === "string") return ti.command;
  if (typeof ti.cmd === "string") return ti.cmd;
  return "";
}

function mapPermission(eventName, cursorOut) {
  if (!cursorOut || typeof cursorOut !== "object") return {};
  if (cursorOut.permission === "deny") {
    const reason = String(cursorOut.user_message ?? cursorOut.agent_message ?? "Blocked by Blekline.");
    return {
      decision: "block",
      reason,
      hookSpecificOutput: {
        hookEventName: eventName,
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    };
  }
  if (cursorOut.updated_input && typeof cursorOut.updated_input === "object") {
    return {
      hookSpecificOutput: {
        hookEventName: eventName,
        permissionDecision: "allow",
        updatedInput: cursorOut.updated_input,
      },
    };
  }
  return {};
}

/**
 * Map Codex stdin JSON to cursor-hooks and emit Codex stdout JSON.
 *
 * @param {object} input
 * @param {import('@blekline/cursor-hooks/config').CursorHookConfig} config
 * @param {string} [eventHint]
 */
export async function runCodexAdapter(input, config, eventHint = "") {
  const event = resolveEventName(input, eventHint);

  if (event === "SessionStart") {
    const out = runSessionStartHook(input, { ...config, platform: "codex" });
    const additionalContext = [out.additional_context, NOTICE_CODEX_INGRESS_AUTO_SEND].filter(Boolean).join("\n\n");
    return {
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext,
      },
    };
  }

  if (event === "UserPromptSubmit") {
    const out = await runMaskPromptHook(input, { ...config, platform: "codex" });
    if (out?.continue === false) {
      return {
        decision: "block",
        reason: String(out.user_message ?? "Blekline blocked this prompt."),
      };
    }
    return {};
  }

  if (event === "PostToolUse") {
    const ti = toolInput(input);
    const command = commandFromToolInput(ti) || (typeof input?.command === "string" ? input.command : "");
    const output = typeof input?.output === "string" ? input.output : typeof ti.output === "string" ? ti.output : "";
    runAfterShellExecutionHook({ command, output }, config);
    return {};
  }

  if (event === "PreToolUse" || event === "PermissionRequest") {
    const name = toolName(input);
    const ti = toolInput(input);
    const command = commandFromToolInput(ti);

    if (name === "Bash" || /^exec_command$/i.test(name)) {
      const shellOut = runBeforeShellExecutionHook({ command }, config);
      const mapped = mapPermission(event, shellOut);
      if (mapped.decision === "block") return mapped;
    }

    if (/^read$/i.test(name) || /read_file/i.test(name)) {
      const filePath =
        typeof ti.file_path === "string"
          ? ti.file_path
          : typeof ti.path === "string"
            ? ti.path
            : "";
      const readOut = runBeforeReadFileHook({ file_path: filePath }, config);
      const mapped = mapPermission(event, readOut);
      if (mapped.decision === "block") return mapped;
    }

    if (/^mcp__/i.test(name) || event === "PermissionRequest") {
      const mcpOut = await runBeforeMcpExecutionHook(
        { tool_name: name, tool_input: ti, command: command || name },
        config
      );
      const mapped = mapPermission(event, mcpOut);
      if (mapped.decision === "block") return mapped;
    }

    const cursorToolName =
      name === "Bash" ? "Shell" : name === "apply_patch" || name === "Edit" ? "Write" : name;
    const preOut = runPreToolUseHook({ tool_name: cursorToolName, tool_input: ti }, config);
    return mapPermission(event, preOut);
  }

  return {};
}
