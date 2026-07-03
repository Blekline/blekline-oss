# @blekline/cursor-hooks

Cursor IDE hooks for Blekline enterprise governance (chat, shell, tools, MCP, reads).

## Hooks

| Hook | Script | Purpose |
|------|--------|---------|
| `beforeSubmitPrompt` | `mask-prompt.mjs` | Cloud-mask chat; block attachments; clipboard safe text |
| `beforeReadFile` | `before-read-file.mjs` | Block `.env`, keys, secrets paths |
| `beforeShellExecution` | `before-shell-execution.mjs` | Deny exfil commands (`cat .env`, secrets in cmd) |
| `preToolUse` | `pre-tool-use.mjs` | Deny Read on sensitive paths; redact Write via `updated_input` |
| `beforeMCPExecution` | `before-mcp-execution.mjs` | Local + cloud enforce; deny unproxied MCP with secrets |
| `afterShellExecution` | `after-shell-execution.mjs` | Metadata audit on command output patterns |
| `sessionStart` | `session-start.mjs` | Inject session env + governance context |

Use **shell wrappers** in `.cursor/hooks/blekline-*.sh` — never bare `node` + `args` in `hooks.json`.

## Config (`.blekline/cursor.json`)

```json
{
  "enterprisePreset": true,
  "apiUrl": "https://app.blekline.com",
  "workspaceToken": "blw_...",
  "promptPolicy": "auto_mask",
  "shellGuard": true,
  "toolGuard": true,
  "mcpGuard": true,
  "shellGuardMode": "local",
  "failClosed": true,
  "copyMaskedToClipboard": true,
  "emitAuditEvents": true
}
```

Fallback: `BLEKLINE_*` env vars or `.cursor/mcp.json` blekline env block.

## Test

```bash
pnpm test
node ../../scripts/cursor-hook-smoke.mjs
```

## Cursor limitations

- `beforeSubmitPrompt` cannot rewrite prompts in-place — block + clipboard paste
- Cloud Agents: no chat-submit or MCP-exec hooks (Cursor platform)
- Production agents: use ingress proxy + MCP proxy

See [Cursor enterprise governance](https://app.blekline.com/docs/enterprise/cursor-enterprise).
