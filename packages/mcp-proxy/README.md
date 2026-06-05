# @blekline/mcp-proxy

MCP proxy router that intercepts downstream tool calls, runs Blekline enforcement (mask/block), then forwards approved calls to a downstream MCP server (e.g. Daytona sandbox).

## Flow

```
Model → @blekline/mcp-proxy → POST /api/mcp/enforce-tool-call → downstream MCP
```

## Env

```bash
BLEKLINE_WORKSPACE_TOKEN=ws_...
BLEKLINE_DOWNSTREAM_MCP_COMMAND=...   # optional mock or real Daytona MCP
BLEKLINE_CLIENT_SURFACE=cursor
```

## Run

```bash
pnpm --filter @blekline/mcp-proxy build
pnpm --filter @blekline/mcp-proxy test
```

Smoke test: `pnpm demo:mcp-smoke` from repo root.

## Docs

- [MCP proxy](https://app.blekline.com/docs/mcp/proxy)
- [Daytona stack](https://app.blekline.com/docs/integrations/daytona-stack)
- [Quick start](https://app.blekline.com/docs/introduction/quick-start)
