# Integrations index

Machine-readable registry: [`manifest.json`](manifest.json).  
Full docs: [app.blekline.com/docs](https://app.blekline.com/docs).

## Execution depth

| Depth | Surfaces | What we ship in this repo |
| ----- | -------- | ------------------------- |
| **A** | Cursor, Codex | MCP + `@blekline/mcp-proxy`, hooks (`*.example`), hook smokes, Platform path in README |
| **B** | Claude Code, Desktop, Copilot, Continue, VS Code ext | MCP (+ proxy), `tools/list` verify, README parity |
| **C** | CLI, CI, SDK examples | [`cli/README.md`](../cli/README.md), `createCellRun`, `example:smoke`, cluster posture optional |

**Tiers:** `verified` (committed config + verify scripts) vs `example` (pattern under [`examples/`](../examples/) with static `example:smoke`).

## Verified surfaces (in this repo)

| Surface | Path | Depth | `BLEKLINE_CLIENT_SURFACE` | Docs |
|---------|------|-------|---------------------------|------|
| Init | `npx @blekline/init` | C | per client | [Overview](https://app.blekline.com/docs) |
| CLI / SDK | [`cli/`](../cli/) | C | `sdk` | [Workflows and runs](https://app.blekline.com/docs/workflows-and-runs) |
| CI / CD | [`ci/`](../ci/) | C | `sdk` | [Connect clients](https://app.blekline.com/docs/connect-clients) |
| Cursor | [`.cursor/mcp.json.example`](../.cursor/mcp.json.example) | A | `cursor` | [MCP Cursor](https://app.blekline.com/docs/mcp/cursor) |
| Codex | [`.codex/config.toml.example`](../.codex/config.toml.example) | A | `codex` | [MCP Codex](https://app.blekline.com/docs/mcp/codex) |
| Claude Code | [`.claude/settings.json.example`](../.claude/settings.json.example) | B | `claude-code` | [Connect clients](https://app.blekline.com/docs/connect-clients) |
| GitHub Copilot | [`.vscode/mcp.json.example`](../.vscode/mcp.json.example) | B | `github-copilot` | [Connect clients](https://app.blekline.com/docs/connect-clients) |
| Continue | [`.vscode/continue.config.json.example`](../.vscode/continue.config.json.example) | B | `continue` | [Connect clients](https://app.blekline.com/docs/connect-clients) |
| Claude Desktop | [`config/claude_desktop_config.json.example`](../config/claude_desktop_config.json.example) | B | `claude-desktop` | [Connect clients](https://app.blekline.com/docs/connect-clients) |
| VS Code extension | [`vscode-extension/`](../vscode-extension/) | B | `github-copilot` | [Connect clients](https://app.blekline.com/docs/connect-clients) |

## Integration examples (tier `example`)

| ID | Example path | Doc slug |
|----|--------------|----------|
| `example-mistral` | [`examples/model-providers/mistral-governed-chat`](../examples/model-providers/mistral-governed-chat) | integrations/mistral-stack |
| `example-fireworks` | [`examples/model-providers/fireworks-governed-chat`](../examples/model-providers/fireworks-governed-chat) | integrations/fireworks-stack |
| `example-langchain` | [`examples/frameworks/langchain-tool-guard`](../examples/frameworks/langchain-tool-guard) | integrations/langchain-stack |
| `example-vercel-ai` | [`examples/frameworks/vercel-ai-tool-guard`](../examples/frameworks/vercel-ai-tool-guard) | integrations/frameworks-and-rag |
| `example-open-swe` | [`examples/agents/open-swe`](../examples/agents/open-swe) | workflows-and-runs |
| `example-hermes` | [`examples/agents/hermes-agent`](../examples/agents/hermes-agent) | connect-clients |
| `example-mcp-pack` | [`examples/agents/mcp-pack`](../examples/agents/mcp-pack) | connect-clients |

Print steps: `npx @blekline/init --example mistral`

## Pattern guides (app docs only)

[Integrations hub](https://app.blekline.com/docs/integrations/agent-clients) · [Concepts](https://app.blekline.com/docs/concepts)

## Verify

```bash
pnpm build:packages
pnpm verify:integrations
pnpm example:smoke
```

Generate configs: `pnpm generate:mcp-configs`