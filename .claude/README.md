# Claude Code

Claude Code uses **two layers** in `settings.json`:

| Layer | Purpose |
|-------|---------|
| `permissions` | Allowed tools for agents working in this repo (Bash, Read, gh) |
| `mcpServers` | Blekline MCP ingress (`blekline`, `blekline-proxy`) |

## Setup

1. Copy [`settings.json.example`](settings.json.example) → `settings.json` (or `pnpm generate:mcp-configs:local`).
2. Set `BLEKLINE_WORKSPACE_TOKEN` and `BLEKLINE_API_URL` in the `mcpServers` env blocks.
3. Restart Claude Code — verify MCP tools: `blekline_mask_prompt`, `blekline_evaluate_tool_call`.

`BLEKLINE_CLIENT_SURFACE=claude-code`

Contributor permissions template: [`../scripts/lib/claude-code-permissions.json`](../scripts/lib/claude-code-permissions.json)

Docs: [Claude Code MCP](https://app.blekline.com/docs/mcp/claude-code)
