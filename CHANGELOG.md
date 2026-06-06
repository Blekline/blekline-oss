# Changelog

All notable changes to [blekline-oss](https://github.com/Blekline/blekline-oss) are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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

[Unreleased]: https://github.com/Blekline/blekline-oss/compare/v0.2.0...main
[0.2.0]: https://github.com/Blekline/blekline-oss/releases/tag/v0.2.0
[0.1.0]: https://github.com/Blekline/blekline-oss/releases/tag/v0.1.0
