# Blekline MCP demo kit

## Prerequisites

1. Copy `.env.example` → `.env` and set `BLEKLINE_WORKSPACE_TOKEN` (Admin → API keys, scope `mask:write` + `events:write`).
2. `pnpm install && pnpm build:packages`
3. `pnpm generate:mcp-configs`

## Client priority

| Priority | Client | Config |
|----------|--------|--------|
| P0 | Cursor | `.cursor/mcp.json` |
| P1 | Claude Desktop | merge `config/claude-desktop.generated.json` into `~/Library/Application Support/Claude/claude_desktop_config.json` |
| P2 | Codex | `.codex/config.toml` (trust project) |

## Vuk demo script (P0 → P1 → P2)

| # | Client | Demo | What to show |
|---|--------|------|--------------|
| 1 | Cursor Agent | `blekline_mask_prompt` | Masked PII in response |
| 2 | Cursor + proxy | Secret in tool args | Block + dashboard event |
| 3 | Claude Desktop | Same mask prompt | Native app, not Cursor |
| 4 | Claude Desktop | `blekline_classify_risk` | High-risk → block_and_review |
| 5 | Codex | Same mask prompt | TOML config works |
| 6 | Codex + proxy | API key in tool call | Block |
| 7 | Browser | `/operations/mcp` | Events from all clients |
| 8 | Terminal | `pnpm demo:sdk` | REST SDK round-trip |
| 9 | Browser | [Daytona stack](https://app.blekline.com/docs/integrations/daytona-stack) | L4 Blekline + L1 Daytona |

Shared prompts: [`prompts.md`](./prompts.md)  
Model QA: [`cursor/model-matrix.md`](./cursor/model-matrix.md)

## Smoke tests

```bash
pnpm demo:mcp-smoke    # headless MCP tools/list
pnpm demo:sdk          # REST mask round-trip (needs live API + token)
pnpm --filter @blekline/mcp-proxy test
```

**Pitch:** Blekline = **Layer 4** governance. Daytona = **Layer 1** infrastructure. [AI Enablement Stack](https://app.blekline.com/docs/introduction/ai-enablement-stack)

**Docs:** [app.blekline.com/docs](https://app.blekline.com/docs) · [Quick start](https://app.blekline.com/docs/introduction/quick-start)
