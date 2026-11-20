#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "==> Blekline setup (bash)"
pnpm install
pnpm build:packages
node scripts/generate-mcp-configs.mjs
echo "==> Done. Next: export BLEKLINE_WORKSPACE_TOKEN=blw_... && pnpm demo:mcp-smoke"
echo "    Policy: https://app.blekline.com/docs/runtime-policy"
echo "    Act runs: https://app.blekline.com/docs/workflows-and-runs"
echo "    Connect: https://app.blekline.com/docs/connect-clients"
