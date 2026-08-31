# @blekline/mcp-proxy

MCP proxy router that intercepts downstream tool calls, runs Blekline enforcement (mask/block), then forwards approved calls to a downstream MCP server (Daytona, Modal, E2B, Cloudflare, Vercel Sandbox, or mock).

## Flow

```
Model → @blekline/mcp-proxy → POST /api/mcp/enforce-tool-call → downstream MCP
```

## Env

```bash
BLEKLINE_WORKSPACE_TOKEN=blw_...
BLEKLINE_DOWNSTREAM_MCP_COMMAND=...   # optional mock or real downstream MCP
BLEKLINE_DOWNSTREAM_SERVER=daytona    # telemetry: daytona|modal|vercel|cloudflare|e2b|unknown
BLEKLINE_CLIENT_SURFACE=cursor
```

## Run

```bash
pnpm --filter @blekline/mcp-proxy build
pnpm --filter @blekline/mcp-proxy test
```

Smoke test: `pnpm demo:mcp-smoke` from repo root. Sandbox providers: `SANDBOX_PROVIDER=daytona pnpm demo:sandbox-smoke`.

## Docs

- [MCP proxy](https://app.blekline.com/docs/mcp/proxy)
- [Sandbox providers](https://app.blekline.com/docs/integrations/sandbox-providers)
- [Eval journey](https://app.blekline.com/docs/get-started/eval-journey)
