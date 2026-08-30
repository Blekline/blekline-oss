# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.3.x   | Yes       |
| 0.2.x   | Yes       |
| 0.1.x   | Best effort |

Older OSS tags are not maintained unless noted in a security advisory.

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Email **security@blekline.com** with:

- Description of the issue and impact
- Steps to reproduce
- Affected package (`@blekline/mcp-server`, `@blekline/client`, etc.)
- Optional: suggested fix or patch

We aim to:

- Acknowledge receipt within **5 business days**
- Provide an initial assessment within **10 business days**
- Coordinate disclosure after a fix or mitigation is available

## Scope

In scope:

- This repository (`blekline-oss`) and published npm packages under `@blekline/*`
- `blekline-client` on PyPI when published
- Ingress sidecar (`packages/ingress-proxy`) — including auth misconfiguration if `BLEKLINE_SIDECAR_AUTH` unset in production
- `@blekline/nhim-audit` — kubeconfig handling, false negatives hiding bypass, accidental secret logging in JSON reports

Out of scope:

- The proprietary app at `app.blekline.com` (report via the same email; routed internally)
- Private `runtime-engine` source (sidecar image issues in scope; crypto internals NDA)
- Third-party MCP servers (e.g. Daytona) unless the issue is in Blekline proxy code

## Sidecar hardening checklist

- Set `BLEKLINE_SIDECAR_AUTH` (32+ characters)
- Bind `BLEKLINE_LISTEN_HOST=127.0.0.1` outside K8s pod network
- Never expose port 8787 via public Ingress
- Helm: `trustVault.enabled` → `replicaCount: 1` + `strategy.type: Recreate`

## Third-party dependencies

Published npm packages use a small, auditable dependency tree:

| Dependency | Used in | Role |
|------------|---------|------|
| [zod](https://www.npmjs.com/package/zod) | `@blekline/contracts` (and via MCP SDK) | Runtime schema validation for API and MCP payloads — not used to evaluate user-supplied code strings |
| [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) | `@blekline/mcp-server`, `@blekline/mcp-proxy` | Official MCP protocol transport and tooling |

**License mix (intentional):** AGPL packages (`mcp-server`, `mcp-proxy`, `ingress-proxy`) depend on Apache-2.0 `@blekline/contracts` and MIT-licensed MCP SDK transitives. This matches the open-core split documented in the README.

**Supply-chain scanners (e.g. Socket.dev):** Automated tools may flag Zod v4 internals that use dynamic code generation for schema documentation. That behavior is in upstream Zod, shared by the MCP ecosystem, and is not Blekline-specific. Report issues to **security@blekline.com** if you believe Blekline passes untrusted input into those code paths.

We run CI on every push to `main` and review dependency updates before OSS releases.

## Config hygiene

- Commit only `*.example` integration configs — never `blw_live_*` tokens, live `blw_[hex…]` keys, or `.env` files.
- Live paths (gitignored): `.cursor/mcp.json`, `.cursor/hooks.json`, `.cursor/blekline/`, `.blekline/mcp.env`, `.claude/settings.json`, `.codex/config.toml`, `.codex/hooks.json`, `.vscode/continue.config.json`, `config/claude_desktop_config.generated.json`.
- Plugin MCP exceptions (committed placeholders only):
  - **Cursor plugin** — `plugins/cursor/mcp.json` uses `${BLEKLINE_WORKSPACE_TOKEN}` + `envFile: .blekline/mcp.env` (generated locally by `@blekline/cursor-hooks init`).
  - **Codex plugin** — `plugins/codex/.mcp.json` uses `blw_replace_with_workspace_token` + `npx -y @blekline/*` (never workspace-local launchers).
- Never commit `.cursor/rules/git-and-public-safety.mdc` (private monorepo operator rule).
- Run `pnpm verify:integrations`, `pnpm audit:oss-public`, and plugin submission audits before opening a PR.

## Safe harbor

We support good-faith security research. Do not access customer data, disrupt production services, or exceed what is necessary to demonstrate a vulnerability.

## Security contacts

- security@blekline.com — vulnerability reports
- https://blekline.com — product security inquiries
