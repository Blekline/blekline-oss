export const CODEX_HOOKS = [
  {
    wrapper: "blekline-session-start",
    event: "SessionStart",
    matcher: "startup|resume",
  },
  {
    wrapper: "blekline-user-prompt-submit",
    event: "UserPromptSubmit",
  },
  {
    wrapper: "blekline-pre-tool-use",
    event: "PreToolUse",
  },
  {
    wrapper: "blekline-post-tool-use",
    event: "PostToolUse",
  },
];

/**
 * @param {{ script: string, event: string }} hook
 */
export function renderPosixAdapterWrapper(hook) {
  return `#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
EVENT="${hook.event}"
SCRIPT="adapter.mjs"
# Monorepo checkout
if [[ -f "\${DIR}/../../packages/codex-hooks/\${SCRIPT}" ]]; then
  exec node "\${DIR}/../../packages/codex-hooks/\${SCRIPT}" "\${EVENT}"
fi
parent="\${DIR}"
for _ in 1 2 3 4 5 6 7 8; do
  parent="$(cd "\${parent}/.." && pwd)"
  if [[ -f "\${parent}/packages/codex-hooks/\${SCRIPT}" ]]; then
    exec node "\${parent}/packages/codex-hooks/\${SCRIPT}" "\${EVENT}"
  fi
done
PKG="$(node -e "try{console.log(require('node:path').dirname(require.resolve('@blekline/codex-hooks/package.json')))}catch(e){}" 2>/dev/null || true)"
if [[ -n "\${PKG}" && -f "\${PKG}/\${SCRIPT}" ]]; then
  exec node "\${PKG}/\${SCRIPT}" "\${EVENT}"
fi
exec npx -y -p @blekline/codex-hooks blekline-codex-hooks "\${EVENT}"
`;
}

/**
 * @param {{ event: string }} hook
 */
export function renderWindowsAdapterWrapper(hook) {
  return `@echo off
setlocal EnableExtensions
set "DIR=%~dp0"
set "EVENT=${hook.event}"
set "SCRIPT=adapter.mjs"
if exist "%DIR%..\\..\\packages\\codex-hooks\\%SCRIPT%" (
  node "%DIR%..\\..\\packages\\codex-hooks\\%SCRIPT%" %EVENT%
  exit /b %ERRORLEVEL%
)
set "WALK=%DIR%"
for /L %%n in (1,1,8) do (
  for %%p in ("%WALK%..") do set "WALK=%%~fp\\"
  if exist "%WALK%packages\\codex-hooks\\%SCRIPT%" (
    node "%WALK%packages\\codex-hooks\\%SCRIPT%" %EVENT%
    exit /b %ERRORLEVEL%
  )
)
for /f "delims=" %%i in ('node -e "try{console.log(require('node:path').dirname(require.resolve('@blekline/codex-hooks/package.json')))}catch(e){}" 2^>nul') do set "PKG=%%i"
if defined PKG if exist "%PKG%\\%SCRIPT%" (
  node "%PKG%\\%SCRIPT%" %EVENT%
  exit /b %ERRORLEVEL%
)
npx -y -p @blekline/codex-hooks blekline-codex-hooks %EVENT%
`;
}

/**
 * @param {string} commandPrefix
 * @param {{ plugin?: boolean, windows?: boolean }} [opts]
 */
export function buildCodexHooksJson(commandPrefix = ".codex/hooks/", opts = {}) {
  const ext = opts.windows ? ".cmd" : ".sh";
  /** @type {Record<string, object[]>} */
  const hooks = {};
  for (const hook of CODEX_HOOKS) {
    const posix = `${commandPrefix}${hook.wrapper}.sh`;
    const windows = `${commandPrefix}${hook.wrapper}.cmd`;
    const command = opts.windows ? windows : posix;
    /** @type {Record<string, unknown>} */
    const handler = {
      type: "command",
      command,
      commandWindows: windows,
    };
    /** @type {Record<string, unknown>} */
    const group = { hooks: [handler] };
    if (hook.matcher) group.matcher = hook.matcher;
    hooks[hook.event] = [group];
  }
  return {
    description: "Blekline Codex governance (adapter over @blekline/cursor-hooks)",
    hooks,
  };
}
