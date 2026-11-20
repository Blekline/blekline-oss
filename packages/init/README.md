# @blekline/init

Detects Claude Code, Cursor, and Codex in the current directory, writes `.blekline/policy.json` (placeholder `blw_...`), and prints next steps for the **Cells platform path** and optional IDE hooks.

```bash
npx @blekline/init
blekline-init --cursor-hooks   # also run @blekline/cursor-hooks init
blekline-init --codex-hooks    # also run @blekline/codex-hooks init
```

After init: [API keys](https://app.blekline.com/docs/api-keys) → [runtime policy](https://app.blekline.com/docs/runtime-policy) → [first act run](https://app.blekline.com/docs/workflows-and-runs).

Native Cursor chat is block+clipboard, not silent auto-send.