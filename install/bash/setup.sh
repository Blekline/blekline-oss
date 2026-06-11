#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "==> Blekline setup (bash)"
pnpm install
pnpm build:packages
node scripts/generate-mcp-configs.mjs
echo "==> Done. Next: export BLEKLINE_WORKSPACE_TOKEN=blw_... && pnpm demo:mcp-smoke"
echo "    Docs: https://app.blekline.com/docs/introduction/quick-start"
