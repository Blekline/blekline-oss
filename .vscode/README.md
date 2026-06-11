# VS Code workspace

## Dev environment (committed)

| File | Purpose |
|------|---------|
| [`settings.json`](settings.json) | Workspace editor + Copilot MCP enabled |
| [`launch.json`](launch.json) | Debug MCP server, proxy, smoke script |
| [`tasks.json`](tasks.json) | `build:packages`, `verify:integrations`, `demo:mcp-smoke` |
| [`extensions.json`](extensions.json) | Recommended extensions |

Open the repo in VS Code → **Run Task** or **Run and Debug** from the sidebar.

## Blekline MCP (secrets — copy from example)

| Client | File |
|--------|------|
| GitHub Copilot | Copy [`mcp.json.example`](mcp.json.example) → `mcp.json` |
| Continue | Copy [`continue.config.json.example`](continue.config.json.example) → `~/.continue/config.json` |

`BLEKLINE_CLIENT_SURFACE=github-copilot` or `continue`

Docs: [GitHub Copilot MCP](https://app.blekline.com/docs/mcp/github-copilot) · [Continue MCP](https://app.blekline.com/docs/mcp/continue)
