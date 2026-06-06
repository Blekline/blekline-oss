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
| 9 | Browser | [Sandbox providers](https://app.blekline.com/docs/integrations/sandbox-providers) | L4 Blekline + L1 runtimes |

Shared prompts: [`prompts.md`](./prompts.md)  
Model QA: [`cursor/model-matrix.md`](./cursor/model-matrix.md)

## Smoke tests

```bash
pnpm demo:mcp-smoke       # headless MCP tools/list
pnpm demo:sdk             # REST mask round-trip (needs live API + token)
pnpm demo:sandbox-smoke   # L1 provider + Blekline mask (see table below)
pnpm --filter @blekline/mcp-proxy test
```

**Pitch:** Blekline = **Layer 4** governance. Pick an **Layer 1** sandbox — [Sandbox providers](https://app.blekline.com/docs/integrations/sandbox-providers). [AI Enablement Stack](https://app.blekline.com/docs/introduction/ai-enablement-stack)

**Docs:** [app.blekline.com/docs](https://app.blekline.com/docs) · [Quick start](https://app.blekline.com/docs/introduction/quick-start)

## L1 sandbox integration smoke tests

Verifies provider credentials + sandbox lifecycle (where applicable) + Blekline mask with no raw PII in output.

| Provider | Command | Required env |
|----------|---------|--------------|
| Daytona | `SANDBOX_PROVIDER=daytona pnpm demo:sandbox-smoke` | `DAYTONA_API_KEY`, `BLEKLINE_WORKSPACE_TOKEN` |
| Modal | `SANDBOX_PROVIDER=modal pnpm demo:sandbox-smoke` | `MODAL_TOKEN_ID`, `MODAL_TOKEN_SECRET`, `BLEKLINE_WORKSPACE_TOKEN` |
| Vercel Sandbox | `SANDBOX_PROVIDER=vercel pnpm demo:sandbox-smoke` | `VERCEL_OIDC_TOKEN` or `VERCEL_TOKEN`, `BLEKLINE_WORKSPACE_TOKEN` |
| Cloudflare | `SANDBOX_PROVIDER=cloudflare pnpm demo:sandbox-smoke` | `CLOUDFLARE_API_TOKEN`, `BLEKLINE_WORKSPACE_TOKEN` |
| E2B | `SANDBOX_PROVIDER=e2b pnpm demo:sandbox-smoke` | `E2B_API_KEY`, `BLEKLINE_WORKSPACE_TOKEN` |

`pnpm demo:daytona-smoke` is an alias for `SANDBOX_PROVIDER=daytona`.
