---
name: verify-governance
description: Check that Blekline Cursor hooks.json uses shell wrappers and policy placeholders are safe.
---

Verify:

1. `.cursor/hooks.json` exists and `beforeSubmitPrompt.command` contains `.cursor/hooks/` or `./hooks/` and a `.sh` or `.cmd` wrapper — not `node` as the command.
2. `.blekline/cursor.json` or `.blekline/policy.json` uses `blw_replace_with_workspace_token` or a user-provided token they have not pasted into git.
3. MCP `blekline` server is configured.

Report missing files and do not print live tokens.
