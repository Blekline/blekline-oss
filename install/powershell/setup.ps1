$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $Root

Write-Host "==> Blekline setup (PowerShell)"
pnpm install
pnpm build:packages
node scripts/generate-mcp-configs.mjs
Write-Host "==> Done. Next: `$env:BLEKLINE_WORKSPACE_TOKEN='blw_...'; pnpm demo:mcp-smoke"
Write-Host "    Docs: https://app.blekline.com/docs/introduction/quick-start"
