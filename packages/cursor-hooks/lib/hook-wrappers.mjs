/**
 * POSIX and Windows wrapper templates. Cursor hooks.json must point at these,
 * never at bare `node` + args.
 *
 * @param {{ script: string, bin: string }} hook
 */
export function renderPosixWrapper(hook) {
  return `#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="${hook.script}"
BIN="${hook.bin}"
# Monorepo checkout
if [[ -f "\${DIR}/../../packages/cursor-hooks/\${SCRIPT}" ]]; then
  exec node "\${DIR}/../../packages/cursor-hooks/\${SCRIPT}"
fi
# Walk up for packages/cursor-hooks (plugin or nested hooks dir)
parent="\${DIR}"
for _ in 1 2 3 4 5 6 7 8; do
  parent="$(cd "\${parent}/.." && pwd)"
  if [[ -f "\${parent}/packages/cursor-hooks/\${SCRIPT}" ]]; then
    exec node "\${parent}/packages/cursor-hooks/\${SCRIPT}"
  fi
done
# Installed package
PKG="$(node -e "try{console.log(require('node:path').dirname(require.resolve('@blekline/cursor-hooks/package.json')))}catch(e){}" 2>/dev/null || true)"
if [[ -n "\${PKG}" && -f "\${PKG}/\${SCRIPT}" ]]; then
  exec node "\${PKG}/\${SCRIPT}"
fi
exec npx -y -p @blekline/cursor-hooks "\${BIN}"
`;
}

/**
 * @param {{ script: string, bin: string }} hook
 */
export function renderWindowsWrapper(hook) {
  return `@echo off
setlocal EnableExtensions
set "DIR=%~dp0"
set "SCRIPT=${hook.script}"
set "BIN=${hook.bin}"
if exist "%DIR%..\\..\\packages\\cursor-hooks\\%SCRIPT%" (
  node "%DIR%..\\..\\packages\\cursor-hooks\\%SCRIPT%"
  exit /b %ERRORLEVEL%
)
set "WALK=%DIR%"
for /L %%n in (1,1,8) do (
  for %%p in ("%WALK%..") do set "WALK=%%~fp\\"
  if exist "%WALK%packages\\cursor-hooks\\%SCRIPT%" (
    node "%WALK%packages\\cursor-hooks\\%SCRIPT%"
    exit /b %ERRORLEVEL%
  )
)
for /f "delims=" %%i in ('node -e "try{console.log(require('node:path').dirname(require.resolve('@blekline/cursor-hooks/package.json')))}catch(e){}" 2^>nul') do set "PKG=%%i"
if defined PKG if exist "%PKG%\\%SCRIPT%" (
  node "%PKG%\\%SCRIPT%"
  exit /b %ERRORLEVEL%
)
npx -y -p @blekline/cursor-hooks %BIN%
`;
}
