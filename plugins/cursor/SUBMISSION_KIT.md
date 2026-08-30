# Cursor marketplace submission kit

QA before submitting this plugin. Logo: copy of `webapp/public/branding/blekline_webclip.png` in `assets/logo.png`.

## Manifest

- [ ] `.cursor-plugin/plugin.json` has `name` `blekline` and `displayName` `Blekline`
- [ ] Paths are relative (`./skills/`, `./hooks/hooks.json`, `./assets/logo.png`) — no `..` or absolute paths
- [ ] `logo` file exists
- [ ] Skills ≤ 4, commands ≤ 3, each with YAML `name` + `description`
- [ ] Rules have YAML frontmatter

## Honest claims

- [ ] README states native chat is **block + clipboard**, not silent auto-send
- [ ] No screenshot or listing copy that shows auto-rewritten compose-box send
- [ ] Token examples are `blw_...` only

## Hooks

- [ ] `hooks/hooks.json` points at `./hooks/blekline-*.sh` (shell wrappers, not bare `node`)
- [ ] Windows `.cmd` wrappers exist next to `.sh`
- [ ] Local install: send a prompt with `AKIAIOSFODNN7EXAMPLE` → block + clipboard
- [ ] Read `.env` via agent → deny
- [ ] `cat .env` in shell → deny

## MCP

- [ ] `mcp.json` uses placeholder `blw_replace_with_workspace_token`
- [ ] `blekline` and `blekline-proxy` servers start (`npx -y @blekline/mcp-server`)

## Assets

```bash
cp webapp/public/branding/blekline_webclip.png plugins/cursor/assets/logo.png
```

Square webclip; listing may also need a 1280×800 screenshot (not committed here).

## Install smoke

1. Copy plugin to `~/.cursor/plugins/local/blekline`
2. Reload Cursor → plugin appears as **Blekline**
3. Enable MCP servers and trust hooks
4. Run `/init-hooks` (or `npx @blekline/cursor-hooks init`)
