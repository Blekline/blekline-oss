# @blekline/mcp-server

Stdio MCP server exposing Blekline governance tools for **Cursor (P0)**, **Claude Desktop (P1)**, and **Codex (P2)**.

## Tools

| Tool | Purpose |
|------|---------|
| `blekline_mask_prompt` | Mask prompt via control plane |
| `blekline_classify_risk` | Policy simulation |
| `blekline_emit_event` | Metadata event ingest |
| `blekline_evaluate_tool_call` | MCP tool allow/mask/block |

## Env

```bash
BLEKLINE_WORKSPACE_TOKEN=ws_...
BLEKLINE_API_URL=https://app.blekline.com  # optional
BLEKLINE_CLIENT_SURFACE=cursor             # cursor | claude-desktop | codex
```

## Run

```bash
pnpm --filter @blekline/mcp-server build
node packages/mcp-server/dist/index.js
```

### SSE transport (remote deploy)

```bash
BLEKLINE_MCP_TRANSPORT=sse BLEKLINE_MCP_PORT=3200 node packages/mcp-server/dist/index.js
# GET http://127.0.0.1:3200/sse
```

Generate configs: `pnpm generate:mcp-configs` from repo root.

## Docs

- [Quick start](https://app.blekline.com/docs/introduction/quick-start)
- [MCP server reference](https://app.blekline.com/docs/mcp/server)
- [Cursor setup](https://app.blekline.com/docs/mcp/cursor)
