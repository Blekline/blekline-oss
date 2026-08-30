---
name: init-hooks
description: Initialize Blekline Cursor hooks (shell wrappers, hooks.json, .blekline/cursor.json).
---

Run in the workspace root:

```bash
npx @blekline/cursor-hooks init
```

Then ask the user to replace `blw_replace_with_workspace_token` in `.blekline/cursor.json`. Remind them native chat is block + clipboard, not silent auto-send.
