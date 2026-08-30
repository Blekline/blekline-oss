# Integrations index

Machine-readable registry: [`manifest.json`](manifest.json).  
Full docs: [app.blekline.com/docs](https://app.blekline.com/docs).

## Verified surfaces (in this repo)

| Surface | Path | `BLEKLINE_CLIENT_SURFACE` | Docs |
|---------|------|---------------------------|------|
| CLI / SDK | [`cli/`](../cli/) | `sdk` | [Eval journey](https://app.blekline.com/docs/get-started/eval-journey) |
| CI / CD | [`ci/`](../ci/) | `sdk` | [CI/CD](https://app.blekline.com/docs/sdk/ci-cd) |
| Claude Code | [`.claude/settings.json.example`](../.claude/settings.json.example) | `claude-code` | [Claude Code](https://app.blekline.com/docs/mcp/claude-code) |
| Cursor | [`.cursor/mcp.json.example`](../.cursor/mcp.json.example) | `cursor` | [Cursor](https://app.blekline.com/docs/mcp/cursor) |
| GitHub Copilot | [`.vscode/mcp.json.example`](../.vscode/mcp.json.example) | `github-copilot` | [Copilot](https://app.blekline.com/docs/mcp/github-copilot) |
| Continue | [`.vscode/continue.config.json.example`](../.vscode/continue.config.json.example) | `continue` | [Continue](https://app.blekline.com/docs/mcp/continue) |
| Claude Desktop | [`config/claude_desktop_config.json.example`](../config/claude_desktop_config.json.example) | `claude-desktop` | [Claude Desktop](https://app.blekline.com/docs/mcp/claude-desktop) |
| Codex | [`.codex/config.toml.example`](../.codex/config.toml.example) | `codex` | [Codex](https://app.blekline.com/docs/mcp/codex) |
| Init (all clients) | `npx @blekline/init` | per client | [Quick start](https://app.blekline.com/docs) |

## Pattern guides (app docs only)

Stack wiring via MCP proxy or SDK — no dedicated config in this repo:

| Surface | `BLEKLINE_CLIENT_SURFACE` | Docs |
|---------|---------------------------|------|
| OpenHands | `openhands` | [OpenHands](https://app.blekline.com/docs/mcp/openhands) |
| Sourcegraph Cody | `sourcegraph-cody` | [Cody](https://app.blekline.com/docs/mcp/sourcegraph-cody) |

Also: [Sandbox providers](https://app.blekline.com/docs/integrations/sandbox-providers) · [Agent clients](https://app.blekline.com/docs/integrations/agent-clients) · [Architecture](https://app.blekline.com/docs/introduction/architecture)

## Cloud-only

Requires [app.blekline.com](https://app.blekline.com): Claude OAuth connector, Azure authoritative PII mask, workspace fleet policy (SSE).

## Verify

```bash
pnpm build:packages
pnpm verify:integrations
```

Generate configs: `pnpm generate:mcp-configs` (examples) or `pnpm generate:mcp-configs --local` (gitignored live configs).
