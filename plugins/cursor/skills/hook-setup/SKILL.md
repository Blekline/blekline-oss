---
name: hook-setup
description: Install and verify the seven Blekline Cursor hook wrappers in the workspace.
---

# Hook setup

Expected files:

- `.cursor/hooks.json` with seven `blekline-*.sh` commands (`.cmd` on Windows)
- `.cursor/hooks/blekline-*.sh` and `blekline-*.cmd`
- `.blekline/cursor.json` with placeholder `blw_replace_with_workspace_token` until the user fills a real token

Install:

```bash
npx @blekline/cursor-hooks init
```

Then in Cursor: **Plugins → Blekline → Configure** → set `BLEKLINE_WORKSPACE_TOKEN` (`blw_...`). Hooks read `.blekline/cursor.json`; plugin MCP reads `.blekline/mcp.env` (synced by init).

Hooks must be **shell wrappers**, not bare `node` + `args`.
