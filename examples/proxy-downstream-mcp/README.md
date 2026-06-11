# Proxy + downstream MCP

Run `@blekline/mcp-proxy` in front of a downstream MCP server (L1 sandbox or custom tools).

```bash
export BLEKLINE_WORKSPACE_TOKEN="blw_..."
export BLEKLINE_API_URL="https://app.blekline.com"
export BLEKLINE_CLIENT_SURFACE="cursor"
export BLEKLINE_MCP_PROXY_MOCK=1
npx -y @blekline/mcp-proxy
```

See [`.cursor/mcp.json.example`](../../.cursor/mcp.json.example) for the `blekline-proxy` block.

Docs: [MCP proxy](https://app.blekline.com/docs/mcp/proxy) · [Sandbox providers](https://app.blekline.com/docs/integrations/sandbox-providers)
