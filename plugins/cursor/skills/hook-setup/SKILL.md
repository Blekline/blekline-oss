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

Hooks must be **shell wrappers**, not bare `node` + `args`.
