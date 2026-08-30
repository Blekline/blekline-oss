# @blekline/init

Detects Claude Code, Cursor, and Codex in the current directory, writes `.blekline/policy.json` (placeholder `blw_...`), and prints next steps.

```bash
npx @blekline/init
blekline-init --cursor-hooks   # also run @blekline/cursor-hooks init
blekline-init --codex-hooks    # also run @blekline/codex-hooks init
```

Native Cursor chat is block+clipboard, not silent auto-send. Codex silent auto-send uses ingress on the OpenAI Responses API.
