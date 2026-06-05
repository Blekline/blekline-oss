---
title: MCP Proxy
description: Tool-call governance before Daytona downstream execution.
---

# MCP Proxy

Package: `@blekline/mcp-proxy`

Intercepts `tools/call`, scans arguments for secrets/destructive patterns, returns **allow | mask | block**, then forwards approved calls to downstream MCP (Daytona or mock).

Env:

- `BLEKLINE_MCP_PROXY_MOCK=1` — demo without Daytona API key
- `BLEKLINE_DOWNSTREAM_MCP_COMMAND` — e.g. `npx,-y,@daytona/mcp-server`
- `DAYTONA_API_KEY` — when using real Daytona

Events: `kind: tool_call_enforcement` in control plane Activity.
