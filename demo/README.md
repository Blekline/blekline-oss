# Blekline MCP demo kit

## Prerequisites

1. Copy `.env.example` → `.env` and set `BLEKLINE_WORKSPACE_TOKEN` (Admin → API keys, scope `mask:write` + `events:write`).
2. `pnpm install && pnpm build:packages`
3. `pnpm generate:mcp-configs`

## Start here

| Step | Path |
|------|------|
| Integrations index | [`integrations/README.md`](../integrations/README.md) |
| Headless smoke | `pnpm demo:mcp-smoke` |
| Client QA matrix | [`qa/client-matrix.md`](./qa/client-matrix.md) |
| Shared prompts | [`prompts.md`](./prompts.md) |

## Smoke tests

```bash
pnpm demo:mcp-smoke       # headless MCP tools/list
pnpm demo:sdk             # REST mask round-trip (needs live API + token)
pnpm demo:sandbox-smoke   # L1 provider + Blekline mask
pnpm verify:integrations  # config + manifest checks
pnpm --filter @blekline/mcp-proxy test
```

**Pitch:** Blekline = **Layer 4** governance. Pick an **Layer 1** sandbox — [Sandbox providers](https://app.blekline.com/docs/integrations/sandbox-providers). [AI Enablement Stack](https://app.blekline.com/docs/introduction/ai-enablement-stack)

**Docs:** [app.blekline.com/docs](https://app.blekline.com/docs) · [Quick start](https://app.blekline.com/docs/introduction/quick-start)

## L1 sandbox integration smoke tests

| Provider | Command | Required env |
|----------|---------|--------------|
| Daytona | `SANDBOX_PROVIDER=daytona pnpm demo:sandbox-smoke` | `DAYTONA_API_KEY`, `BLEKLINE_WORKSPACE_TOKEN` |
| Modal | `SANDBOX_PROVIDER=modal pnpm demo:sandbox-smoke` | `MODAL_TOKEN_ID`, `MODAL_TOKEN_SECRET`, `BLEKLINE_WORKSPACE_TOKEN` |
| Vercel Sandbox | `SANDBOX_PROVIDER=vercel pnpm demo:sandbox-smoke` | `VERCEL_OIDC_TOKEN` or `VERCEL_TOKEN`, `BLEKLINE_WORKSPACE_TOKEN` |
| Cloudflare | `SANDBOX_PROVIDER=cloudflare pnpm demo:sandbox-smoke` | `CLOUDFLARE_API_TOKEN`, `BLEKLINE_WORKSPACE_TOKEN` |
| E2B | `SANDBOX_PROVIDER=e2b pnpm demo:sandbox-smoke` | `E2B_API_KEY`, `BLEKLINE_WORKSPACE_TOKEN` |

`pnpm demo:daytona-smoke` is an alias for `SANDBOX_PROVIDER=daytona`.
