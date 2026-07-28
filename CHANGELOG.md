# Changelog

All notable changes to [blekline-oss](https://github.com/Blekline/blekline-oss) are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- `@blekline/nhim-audit` — static Kubernetes agent-hop audit CLI (`npx @blekline/nhim-audit audit`)
- NHIM Audit GitHub Action under `ci/github-actions/nhim-audit/`

## [0.2.0-nhim] - 2026-06-10

### Added

- NHIM sidecar security: `BLEKLINE_SIDECAR_AUTH`, listen host default `127.0.0.1`, body size limit
- Trust Vault + Lineage APIs on sidecar (compiled runtime; source private)
- Helm: `Recreate` strategy, NetworkPolicy, non-root, `replicaCount: 1` for vault mode
- `docker-compose.yaml` + `scripts/local-sidecar-env.sh` for local trial

### Changed

- Sidecar image tag `blekline-sidecar:0.2.0-nhim`
- OSS sync allowlist — excludes `runtime-engine`, `k8s-admission`

### Security

- Unauthenticated enforce endpoint removed (401 without Bearer)
- Upstream errors return generic `errorId` (no stack leak)

## [0.4.1] - 2026-07-03

### Added

- **`@blekline/cursor-hooks@0.1.0`** on npm — enterprise Cursor hooks (local-first chat mask, read/shell/tool/MCP guards, Activity audit)
- `pnpm demo:cursor-hook-smoke` in OSS CI release gate

## [0.4.0] - 2026-06-10

### Added

- Repo layout: `cli/`, `ci/`, agent dotdirs (`.cursor`, `.claude`, `.vscode`, `.codex`), `config/`, `integrations/` manifest
- `claude-code` client surface; centralized `parseClientSurfaceFromEnv` in `@blekline/contracts`
- `pnpm verify:integrations`, `AGENTS.md`, install scripts, SDK examples
- Headless `tools/list` verify per manifest surface; Python SDK pytest in CI
- Sync purge for live MCP configs (ship `*.example` only)

### Changed

- README: CLI-first navigation; Connect table for all verified surfaces
- `demo/qa/client-matrix.md` replaces `demo/cursor/model-matrix.md`
- MCP server tools modularized under `packages/mcp-server/src/tools/`

## [0.3.0] - 2026-06-06

### Added

- Ecosystem integration docs (hosted on app.blekline.com): 26 L5/L2/L3 partners
- Extended `CLIENT_SURFACES`: continue, github-copilot, openhands, sourcegraph-cody
- OSS README integration link tables for agent clients, models, frameworks, eval partners

## [0.2.0] - 2026-06-05

### Added

- Multi-provider L1 ecosystem: Daytona, Modal, Vercel Sandbox, Cloudflare, E2B
- `demo/sandbox-smoke` harness with per-provider modules
- `BLEKLINE_DOWNSTREAM_SERVER` telemetry label for mcp-proxy
- Sandbox integration CI matrix (opt-in per provider)

## [0.1.0] - 2026-06-04

### Added

- `@blekline/mcp-server` — MCP tools: mask, classify, enforce, emit
- `@blekline/mcp-proxy` — downstream MCP governance (Daytona-compatible)
- `@blekline/client` / `blekline-client` — TypeScript and Python SDKs
- `@blekline/contracts` — local secret scan and tool policy (Apache-2.0)
- `ingress-proxy` — Docker image and Helm chart
- Docs: Cursor, Claude Desktop, Codex, trust boundaries, latency SLO

[Unreleased]: https://github.com/Blekline/blekline-oss/compare/v0.4.0...main
[0.4.0]: https://github.com/Blekline/blekline-oss/releases/tag/v0.4.0
[0.3.0]: https://github.com/Blekline/blekline-oss/releases/tag/v0.3.0
[0.2.0]: https://github.com/Blekline/blekline-oss/releases/tag/v0.2.0
[0.1.0]: https://github.com/Blekline/blekline-oss/releases/tag/v0.1.0
