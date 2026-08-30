# @blekline/mcp-server

Stdio MCP server exposing Blekline governance tools for all [verified client surfaces](https://github.com/Blekline/blekline-oss/tree/main/integrations).

## 60-second path

No clone. Create a [Free workspace](https://app.blekline.com/auth/signup), copy a token (`blw_...`) from **Admin → API keys**, then:

```bash
export BLEKLINE_WORKSPACE_TOKEN="blw_..."
export BLEKLINE_API_URL="https://app.blekline.com"
export BLEKLINE_CLIENT_SURFACE="sdk"
npx -y @blekline/mcp-server
```

Then connect [Claude Code](https://app.blekline.com/docs/mcp/claude-code), [Claude Desktop](https://app.blekline.com/docs/mcp/claude-connector), or [Cursor](https://app.blekline.com/docs/mcp/cursor). Paths: [choose your path](https://app.blekline.com/docs/get-started/paths).

## Tools

| Tool | Purpose |
|------|---------|
| `blekline_mask_prompt` | Mask prompt via control plane |
| `blekline_classify_risk` | Policy simulation |
| `blekline_emit_event` | Metadata event ingest |
| `blekline_evaluate_tool_call` | MCP tool allow/mask/block |
| `blekline_threat_search` | Read-only search public Agent Threat Landscape |
| `blekline_arena_lookup` | Read-only Agent Security Arena scores |

## Env

```bash
BLEKLINE_WORKSPACE_TOKEN=blw_...
BLEKLINE_API_URL=https://app.blekline.com  # optional
BLEKLINE_CLIENT_SURFACE=cursor             # see integrations/manifest.json
```

## Run (from this repo)

```bash
pnpm --filter @blekline/mcp-server build
node packages/mcp-server/dist/index.js
```

### SSE transport (remote deploy)

```bash
BLEKLINE_MCP_TRANSPORT=sse BLEKLINE_MCP_PORT=3200 node packages/mcp-server/dist/index.js
# GET http://127.0.0.1:3200/sse
```

Generate configs: `pnpm generate:mcp-configs` — examples in `.cursor/`, `.claude/`, `.vscode/`, `.codex/`, `config/`.

## Docs

- [Choose your path](https://app.blekline.com/docs/get-started/paths)
- [Quick start](https://app.blekline.com/docs)
- [MCP server reference](https://app.blekline.com/docs/mcp/server)
- [Cursor setup](https://app.blekline.com/docs/mcp/cursor)
