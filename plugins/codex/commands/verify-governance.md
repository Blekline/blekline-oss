---
name: verify-governance
description: Check Codex hooks.json uses shell wrappers and tokens are placeholders.
---

1. `.codex/hooks.json` handlers use `.sh` / `.cmd` wrapper paths, not bare `node`.
2. `.mcp.json` / `.blekline/policy.json` tokens are `blw_...` placeholders unless the user configured a live token locally.
3. Do not print live tokens.
