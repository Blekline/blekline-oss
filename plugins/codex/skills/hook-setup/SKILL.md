---
name: hook-setup
description: Install Blekline Codex hook wrappers (.sh and .cmd) via @blekline/codex-hooks init.
---

# Hook setup

```bash
npx @blekline/codex-hooks init
```

Expect `.codex/hooks.json` with shell wrappers under `.codex/hooks/`. Trust hooks in `/hooks`. Commands must not be bare `node` + args.
