# Coding agents (MCP ingress)

Shared pattern: `npx @blekline/mcp-server` + optional `@blekline/mcp-proxy` with `BLEKLINE_CLIENT_SURFACE` set per host.

| Agent | Notes |
| ----- | ----- |
| OpenCode | MCP stdio; see host docs |
| Pi | MCP stdio |
| Muse Code | MCP stdio |
| Grok Build | MCP stdio |
| OpenClaw | MCP stdio |
| Droid | MCP stdio |
| Hermes Agent | MCP or SDK; see [agents/hermes-agent](../hermes-agent/README.md) |

**Platform path:** [runtime policy](https://app.blekline.com/docs/runtime-policy) → [workflows and runs](https://app.blekline.com/docs/workflows-and-runs). Copy [.cursor/mcp.json.example](../../../.cursor/mcp.json.example) and set `BLEKLINE_CLIENT_SURFACE`.