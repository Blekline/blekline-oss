# Cursor

Plug-and-play Blekline for Cursor: **MCP tools** + **chat auto-mask hooks**.

## One-command setup

From repo root (with token in `.env`, `webapp/.env.local`, or environment):

```bash
pnpm install && pnpm build:packages
pnpm generate:mcp-configs --local
```

Then **Developer: Reload Window** in Cursor.

## What gets generated (gitignored locally)

| File | Purpose |
|------|---------|
| `.cursor/mcp.json` | MCP server + proxy (token inlined) |
| `.cursor/hooks.json` | Chat auto-mask + `.env` read guard |
| `.blekline/cursor.json` | Hook config (token, policy) |
| `.cursor/rules/blekline-chat-guard.mdc` | Agent backup layer |

Committed templates: `*.example` only.

## Chat auto-mask (how it works)

Cursor cannot rewrite prompts in-flight today. Blekline hooks use **`beforeSubmitPrompt`**:

1. Cloud-mask your message via `/api/mask`
2. If entities are found → **block** the raw prompt from reaching the model
3. Copy **masked text to clipboard** (Mac/Win/Linux)
4. You **Cmd+V + Enter** to send the safe version

Policy in `.blekline/cursor.json`:

- `auto_mask` (default) — mask + clipboard + block
- `block` — mask + block, no clipboard
- `agent` — local hard-secret block only; rely on MCP + rules
- `off` — hooks no-op

Also blocks Agent reads of `.env`, keys, and `secrets/` paths.

`BLEKLINE_CLIENT_SURFACE=cursor`

Docs: [Cursor MCP](https://app.blekline.com/docs/mcp/cursor)
