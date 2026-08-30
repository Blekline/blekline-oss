# Cursor marketplace submission kit

Last audited: **2026-08-30** · Headless: `pnpm demo:cursor-plugin-submission-audit`

## Status summary

| Area | Status |
|------|--------|
| Manifest + marketplace.json | Pass |
| Skills (4) + commands (3) + rules | Pass |
| Hooks (7 events, `.sh` + `.cmd`) | Pass |
| MCP (workspace-relative paths) | Pass |
| Honest claims (block + clipboard) | Pass |
| Headless smokes | Pass |
| OSS sync (`.cursor-plugin/` included) | Pass after `pnpm sync:oss` |
| Listing screenshot 1280×800 | **You** — not in repo |
| Cursor publisher submit | **You** — after OSS push |

## Manifest

- [x] `.cursor-plugin/plugin.json` — `name` `blekline`, `displayName` `Blekline`
- [x] `marketplace.json` at plugin root (`source: "./"`)
- [x] Paths relative — no `..` or absolute paths
- [x] `logo`: `assets/logo.svg` (+ optional `logo.png` for screenshots)
- [x] Skills ≤ 4, commands ≤ 3, YAML `name` + `description`
- [x] Rules have YAML frontmatter
- [x] Plugin `variables`: `BLEKLINE_WORKSPACE_TOKEN` (required), `BLEKLINE_API_URL`

## Honest claims

- [x] README: native chat is **block + clipboard**, not silent auto-send
- [x] No listing copy implying auto-rewritten compose box
- [x] Token examples are `blw_...` placeholders only

## Hooks

- [x] `hooks/hooks.json` → `./hooks/blekline-*.sh` (not bare `node`)
- [x] Windows `.cmd` wrappers paired with every `.sh`
- [x] Smoke: `AKIAIOSFODNN7EXAMPLE` → block; `.env` read/shell → deny

## MCP (critical for plugin MCP)

Plugin MCP **does not expand** `${workspaceFolder}`. Use workspace-relative paths only.

- [x] `args`: `.cursor/blekline/run-mcp-server.mjs` (written by `npx @blekline/cursor-hooks init`)
- [x] `envFile`: `.blekline/mcp.env` (synced from `.blekline/cursor.json` on init)
- [x] Env placeholders: `${BLEKLINE_WORKSPACE_TOKEN}`, `${BLEKLINE_API_URL}`
- [x] Do **not** ship `plugins/cursor/scripts/` launchers — init installs to workspace

**User flow after install:**

```bash
npx @blekline/cursor-hooks init   # .cursor/blekline/* + .blekline/mcp.env
# set workspaceToken in .blekline/cursor.json, re-run init
# Developer: Reload Window in Cursor
```

## Assets

```bash
cp webapp/public/branding/blekline-icon.svg plugins/cursor/assets/logo.svg
cp webapp/public/branding/blekline_webclip.png plugins/cursor/assets/logo.png  # optional screenshot
```

## Headless QA (run before submit)

```bash
pnpm demo:cursor-hook-smoke
pnpm demo:cursor-plugin-install-smoke
pnpm demo:cursor-plugin-submission-audit
pnpm audit:oss-public && pnpm sync:oss
```

## Manual submit checklist

1. Push **`blekline-oss`** with `plugins/cursor/` (includes `.cursor-plugin/`, `marketplace.json`)
2. Cursor → **Settings → Plugins → Publish** (or current publisher flow)
3. Connect **github.com/Blekline/blekline-oss** path `plugins/cursor` if Git-based
4. Listing name: **Blekline**
5. Screenshot **1280×800**: MCP green + block notice (not fake auto-send UI)
6. Submit → wait review

## Local reference install

```bash
cp -R plugins/cursor ~/.cursor/plugins/local/blekline
npx @blekline/cursor-hooks init
# Reload Cursor → enable plugin MCP → trust hooks
```
