---
title: Claude Desktop
description: P1 — native Claude app MCP integration.
---

# Claude Desktop

Merge generated config into:

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```bash
pnpm generate:mcp-configs
# copy config/claude-desktop.generated.json → Claude config
```

Restart Claude Desktop. Use tool picker to invoke `blekline_mask_prompt`.

Set `BLEKLINE_CLIENT_SURFACE=claude-desktop` in env (included in generated config).
