/**
 * Catalog of the 7 Blekline Cursor hooks. Used by init and plugin wrappers.
 * commands.json / hooks.json must use shell wrappers — never bare `node` + args.
 */
export const CURSOR_HOOKS = [
  {
    id: "session-start",
    script: "session-start.mjs",
    bin: "blekline-cursor-session-start",
    wrapper: "blekline-session-start",
    cursorEvent: "sessionStart",
    cursor: {},
  },
  {
    id: "mask-prompt",
    script: "mask-prompt.mjs",
    bin: "blekline-cursor-mask-prompt",
    wrapper: "blekline-mask-prompt",
    cursorEvent: "beforeSubmitPrompt",
    cursor: { timeout: 5 },
  },
  {
    id: "before-read-file",
    script: "before-read-file.mjs",
    bin: "blekline-cursor-before-read-file",
    wrapper: "blekline-before-read-file",
    cursorEvent: "beforeReadFile",
    cursor: { failClosed: true },
  },
  {
    id: "before-shell-execution",
    script: "before-shell-execution.mjs",
    bin: "blekline-cursor-before-shell",
    wrapper: "blekline-before-shell-execution",
    cursorEvent: "beforeShellExecution",
    cursor: { matcher: "curl|wget|cat|grep|type|head|tail", failClosed: true },
  },
  {
    id: "pre-tool-use",
    script: "pre-tool-use.mjs",
    bin: "blekline-cursor-pre-tool-use",
    wrapper: "blekline-pre-tool-use",
    cursorEvent: "preToolUse",
    cursor: { matcher: "Read|Write|Shell|Grep|Delete|edit|write_file|run_terminal_cmd" },
  },
  {
    id: "before-mcp-execution",
    script: "before-mcp-execution.mjs",
    bin: "blekline-cursor-before-mcp",
    wrapper: "blekline-before-mcp-execution",
    cursorEvent: "beforeMCPExecution",
    cursor: { failClosed: true },
  },
  {
    id: "after-shell-execution",
    script: "after-shell-execution.mjs",
    bin: "blekline-cursor-after-shell",
    wrapper: "blekline-after-shell-execution",
    cursorEvent: "afterShellExecution",
    cursor: {},
  },
];

/**
 * @param {string} commandPrefix e.g. ".cursor/hooks/" or "./hooks/"
 * @param {{ windows?: boolean }} [opts]
 */
export function buildCursorHooksJson(commandPrefix = ".cursor/hooks/", opts = {}) {
  const ext = opts.windows ? ".cmd" : ".sh";
  /** @type {Record<string, object[]>} */
  const hooks = {};
  for (const hook of CURSOR_HOOKS) {
    const command = `${commandPrefix}${hook.wrapper}${ext}`;
    const entry = { command, ...hook.cursor };
    hooks[hook.cursorEvent] = [entry];
  }
  return { version: 1, hooks };
}

export function defaultCursorJson() {
  return {
    apiUrl: "https://app.blekline.com",
    workspaceToken: "blw_replace_with_workspace_token",
    platform: "cursor",
    promptPolicy: "auto_mask",
    promptGuardMode: "local_first",
    promptMaskSource: "local",
    maskBackend: "local",
    failClosed: false,
    readGuard: true,
    shellGuard: true,
    toolGuard: true,
    mcpGuard: true,
    shellGuardMode: "local",
    mcpGuardMode: "local",
    enterprisePreset: false,
    copyMaskedToClipboard: true,
    emitAuditEvents: true,
    showMaskedInUi: false,
    maskTimeoutMs: 3500,
  };
}
