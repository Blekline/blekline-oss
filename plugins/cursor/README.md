# Blekline Cursor plugin

Governance for Cursor: chat mask, file/shell/tool/MCP guards, and MCP servers (`blekline` + `blekline-proxy`).

## Install

**This repo (local):**

1. Cursor Settings → Plugins → add local plugin from `plugins/cursor/`
2. Or copy this folder to `~/.cursor/plugins/local/blekline`
3. Run `npx @blekline/cursor-hooks init` in the workspace (writes `.cursor/hooks/*.sh` and `.cmd` wrappers)
4. Set `workspaceToken` in `.blekline/cursor.json` to your token (placeholder `blw_...` only in git)

**npm:**

```bash
npx @blekline/init --cursor-hooks
```

## Native chat is not silent auto-send

Cursor `beforeSubmitPrompt` **cannot rewrite** the compose box. Blekline **blocks** a prompt that contains secrets/PII and copies a masked version to the **clipboard**. Paste (Cmd+V / Ctrl+V) then Enter.

Do not claim silent auto-send on native Cursor chat. For zero-click masking on agents you control, use **ingress**.

## Hooks

Seven wrappers over `@blekline/cursor-hooks` (shell/`.cmd`, not bare `node`):

| Cursor event | Wrapper |
|---|---|
| `sessionStart` | `blekline-session-start` |
| `beforeSubmitPrompt` | `blekline-mask-prompt` |
| `beforeReadFile` | `blekline-before-read-file` |
| `beforeShellExecution` | `blekline-before-shell-execution` |
| `preToolUse` | `blekline-pre-tool-use` |
| `beforeMCPExecution` | `blekline-before-mcp-execution` |
| `afterShellExecution` | `blekline-after-shell-execution` |

## Logo

See `assets/` — source `webapp/public/branding/blekline_webclip.png`.
