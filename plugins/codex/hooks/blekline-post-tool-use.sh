#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
EVENT="PostToolUse"
SCRIPT="adapter.mjs"
# Monorepo checkout
if [[ -f "${DIR}/../../packages/codex-hooks/${SCRIPT}" ]]; then
  exec node "${DIR}/../../packages/codex-hooks/${SCRIPT}" "${EVENT}"
fi
parent="${DIR}"
for _ in 1 2 3 4 5 6 7 8; do
  parent="$(cd "${parent}/.." && pwd)"
  if [[ -f "${parent}/packages/codex-hooks/${SCRIPT}" ]]; then
    exec node "${parent}/packages/codex-hooks/${SCRIPT}" "${EVENT}"
  fi
done
PKG="$(node -e "try{console.log(require('node:path').dirname(require.resolve('@blekline/codex-hooks/package.json')))}catch(e){}" 2>/dev/null || true)"
if [[ -n "${PKG}" && -f "${PKG}/${SCRIPT}" ]]; then
  exec node "${PKG}/${SCRIPT}" "${EVENT}"
fi
exec npx -y -p @blekline/codex-hooks blekline-codex-hooks "${EVENT}"
