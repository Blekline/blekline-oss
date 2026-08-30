# Blekline Codex plugin

Governance for Codex: UserPromptSubmit mask/block, PreToolUse guards, MCP (`blekline` + `blekline-proxy`).

## Install

1. Add a marketplace that points at this folder (`marketplace.json` in this directory, or `$REPO_ROOT/.agents/plugins/marketplace.json` with `source.path` `./plugins/codex`)
2. `codex plugin marketplace add ./plugins/codex` (or the repo marketplace root)
3. Trust plugin hooks in `/hooks`
4. `npx @blekline/codex-hooks init` in the workspace

```bash
npx @blekline/init --codex-hooks
```

## Silent auto-send is ingress Responses

Native Codex hooks can **block** a prompt (`UserPromptSubmit` decision: block) or add context. They **do not** rewrite the user prompt in place for silent auto-send.

For silent auto-send, send OpenAI **Responses** traffic through **Blekline ingress**. Native hooks stay a local guardrail.

## Hooks

Adapter over `@blekline/cursor-hooks` (the same 7 implementations), mapped to Codex events via shell/`.cmd` wrappers — not bare `node`.

| Codex event | Wrapper | Cursor-hooks coverage |
|---|---|---|
| `SessionStart` | `blekline-session-start` | session-start |
| `UserPromptSubmit` | `blekline-user-prompt-submit` | mask-prompt |
| `PreToolUse` | `blekline-pre-tool-use` | read / shell / tool / MCP |
| `PostToolUse` | `blekline-post-tool-use` | after-shell |

## Logo

See `assets/` — source `webapp/public/branding/blekline_webclip.png`.
