# @blekline/codex-hooks

Thin adapter: Codex lifecycle events → `@blekline/cursor-hooks` (the 7 Cursor hook implementations).

## Init

```bash
npx @blekline/codex-hooks init
```

Writes `.codex/hooks.json` plus POSIX `.sh` and Windows `.cmd` wrappers under `.codex/hooks/`. Commands are shell wrappers — never bare `node` + args.

## Silent auto-send

Native Codex `UserPromptSubmit` can **block** a prompt or add context. It does **not** rewrite the compose box for silent auto-send.

For silent auto-send, send traffic through **Blekline ingress on the OpenAI Responses API**. Native hooks remain a local guardrail.

Placeholder token: `blw_...`.

## Test

```bash
pnpm test
node ../../scripts/codex-hook-smoke.mjs
```
