@echo off
setlocal EnableExtensions
set "DIR=%~dp0"
set "EVENT=PreToolUse"
set "SCRIPT=adapter.mjs"
if exist "%DIR%..\..\packages\codex-hooks\%SCRIPT%" (
  node "%DIR%..\..\packages\codex-hooks\%SCRIPT%" %EVENT%
  exit /b %ERRORLEVEL%
)
set "WALK=%DIR%"
for /L %%n in (1,1,8) do (
  for %%p in ("%WALK%..") do set "WALK=%%~fp\"
  if exist "%WALK%packages\codex-hooks\%SCRIPT%" (
    node "%WALK%packages\codex-hooks\%SCRIPT%" %EVENT%
    exit /b %ERRORLEVEL%
  )
)
for /f "delims=" %%i in ('node -e "try{console.log(require('node:path').dirname(require.resolve('@blekline/codex-hooks/package.json')))}catch(e){}" 2^>nul') do set "PKG=%%i"
if defined PKG if exist "%PKG%\%SCRIPT%" (
  node "%PKG%\%SCRIPT%" %EVENT%
  exit /b %ERRORLEVEL%
)
npx -y -p @blekline/codex-hooks blekline-codex-hooks %EVENT%
