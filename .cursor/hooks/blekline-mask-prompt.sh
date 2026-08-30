#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="mask-prompt.mjs"
BIN="blekline-cursor-mask-prompt"
# Monorepo checkout
if [[ -f "${DIR}/../../packages/cursor-hooks/${SCRIPT}" ]]; then
  exec node "${DIR}/../../packages/cursor-hooks/${SCRIPT}"
fi
# Walk up for packages/cursor-hooks (plugin or nested hooks dir)
parent="${DIR}"
for _ in 1 2 3 4 5 6 7 8; do
  parent="$(cd "${parent}/.." && pwd)"
  if [[ -f "${parent}/packages/cursor-hooks/${SCRIPT}" ]]; then
    exec node "${parent}/packages/cursor-hooks/${SCRIPT}"
  fi
done
# Installed package
PKG="$(node -e "try{console.log(require('node:path').dirname(require.resolve('@blekline/cursor-hooks/package.json')))}catch(e){}" 2>/dev/null || true)"
if [[ -n "${PKG}" && -f "${PKG}/${SCRIPT}" ]]; then
  exec node "${PKG}/${SCRIPT}"
fi
exec npx -y -p @blekline/cursor-hooks "${BIN}"
