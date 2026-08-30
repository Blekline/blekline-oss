# Blekline Cursor plugin

Governance for Cursor: chat mask, file/shell/tool/MCP guards, and MCP servers (`blekline` + `blekline-proxy`).

## Install

**This repo (local):**

1. Cursor Settings → Plugins → add local plugin from `plugins/cursor/`
2. Or copy this folder to `~/.cursor/plugins/local/blekline`
3. Run `npx @blekline/cursor-hooks init` — writes hooks, **`.cursor/blekline/run-mcp-*.mjs`** (plugin MCP entrypoints), and **`.blekline/mcp.env`**
4. Set `workspaceToken` in `.blekline/cursor.json` (`blw_...`) then re-run init to refresh `mcp.env`
5. Reload Cursor → plugin MCP should connect green; listing icon from `assets/logo.svg`

**Avoid duplicate MCP entries:** Disable workspace `.cursor/mcp.json` blekline servers when using the plugin MCP — keep only one set enabled.

**Monorepo dev:** Launchers prefer `packages/mcp-server` / `mcp-proxy` dist when present; otherwise `~/.cache/blekline/`. Do not use bare `npx @blekline/mcp-server` (broken Homebrew shim on some machines).

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

Plugin listing uses `assets/logo.svg` (from `webapp/public/branding/blekline-icon.svg`). PNG webclip copy optional for marketplace screenshots — see `assets/README.md`.
