# Blekline — agent onboarding

Production agent interaction governance — mask, enforce, and audit at the MCP, SDK, and ingress proxy boundary.

## Start (headless)

```bash
pnpm install && pnpm build:packages
export BLEKLINE_WORKSPACE_TOKEN="blw_..."
export BLEKLINE_API_URL="https://app.blekline.com"
export BLEKLINE_CLIENT_SURFACE="sdk"
pnpm demo:mcp-smoke
```

## Connect a client

See [`integrations/README.md`](integrations/README.md) and [`integrations/manifest.json`](integrations/manifest.json).

| Priority | Path |
|----------|------|
| CLI / SDK | `cli/` |
| CI gate | `ci/` |
| Claude Code | `.claude/settings.json.example` (permissions + MCP) |
| Cursor | `.cursor/mcp.json.example` |
| VS Code / Copilot / Continue | `.vscode/` |
| Claude Desktop | `config/claude_desktop_config.json.example` |
| Codex | `.codex/config.toml.example` |

Generate examples: `pnpm generate:mcp-configs`  
Live configs (gitignored): `pnpm generate:mcp-configs:local`

## VS Code contributors

- `launch.json` — debug MCP server / proxy
- `tasks.json` — build, verify, smoke
- Optional: [Dev Container](.devcontainer/devcontainer.json)

## Verify

```bash
pnpm verify:integrations
```

## Docs

https://app.blekline.com/docs

## Packages

- `@blekline/mcp-server` — MCP tools (AGPL)
- `@blekline/mcp-proxy` — downstream MCP governance (AGPL)
- `@blekline/nhim-audit` — static K8s NHIM audit CLI (AGPL)
- `@blekline/client` — TypeScript SDK (Apache-2.0)
- `@blekline/contracts` — schemas + local enforce (Apache-2.0)
- `@blekline/init` — one-shot client wiring (`npx @blekline/init`)
- `@blekline/cursor-hooks` / `@blekline/codex-hooks` — IDE hook packages (Apache-2.0)
- `@blekline/claude-sdk` — Claude ingress SDK (Apache-2.0)
- `@blekline/client-hooks` — shared hook utilities (Apache-2.0)

Private moat (never OSS): `runtime-engine`, `k8s-admission`, `kernel-plane`.
