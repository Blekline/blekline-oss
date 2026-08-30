@echo off
setlocal EnableExtensions
set "DIR=%~dp0"
set "SCRIPT=after-shell-execution.mjs"
set "BIN=blekline-cursor-after-shell"
if exist "%DIR%..\..\packages\cursor-hooks\%SCRIPT%" (
  node "%DIR%..\..\packages\cursor-hooks\%SCRIPT%"
  exit /b %ERRORLEVEL%
)
set "WALK=%DIR%"
for /L %%n in (1,1,8) do (
  for %%p in ("%WALK%..") do set "WALK=%%~fp\"
  if exist "%WALK%packages\cursor-hooks\%SCRIPT%" (
    node "%WALK%packages\cursor-hooks\%SCRIPT%"
    exit /b %ERRORLEVEL%
  )
)
for /f "delims=" %%i in ('node -e "try{console.log(require('node:path').dirname(require.resolve('@blekline/cursor-hooks/package.json')))}catch(e){}" 2^>nul') do set "PKG=%%i"
if defined PKG if exist "%PKG%\%SCRIPT%" (
  node "%PKG%\%SCRIPT%"
  exit /b %ERRORLEVEL%
)
npx -y -p @blekline/cursor-hooks %BIN%
