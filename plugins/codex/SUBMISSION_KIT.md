# Codex marketplace submission kit

QA before listing. Logo: copy of `webapp/public/branding/blekline_webclip.png` in `assets/logo.png`.

## Manifest

- [ ] `.codex-plugin/plugin.json` `name` is kebab-case `blekline`
- [ ] `interface.displayName` is `Blekline`
- [ ] Paths start with `./` and stay inside the plugin root
- [ ] `marketplace.json` has `policy.installation`, `policy.authentication`, and `category`
- [ ] Skills ≤ 4, commands ≤ 3, YAML `name` + `description`

## Honest claims

- [ ] README states silent auto-send is **ingress on the OpenAI Responses API**
- [ ] Native hooks described as block / additional context only
- [ ] Tokens are `blw_...` placeholders

## Hooks

- [ ] `hooks/hooks.json` uses `type: command` and shell wrappers (`.sh` / `commandWindows` `.cmd`)
- [ ] User trusts hooks in `/hooks` after install
- [ ] Prompt with `AKIAIOSFODNN7EXAMPLE` → `decision: block`
- [ ] `PreToolUse` Bash `cat .env` → deny

## MCP

- [ ] `.mcp.json` placeholder `blw_replace_with_workspace_token`
- [ ] Servers: `npx -y @blekline/mcp-server` and `npx -y @blekline/mcp-proxy`

## Assets

```bash
cp webapp/public/branding/blekline_webclip.png plugins/codex/assets/logo.png
```

## Install smoke

1. `codex plugin marketplace add ./plugins/codex` (or wire `.agents/plugins/marketplace.json`)
2. Enable plugin → review hooks → send a secret-bearing prompt → confirm block
