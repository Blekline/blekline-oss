---
title: Quick Start
description: Connect Blekline ingress governance in minutes.
---

# Quick Start

Blekline governs **what enters** AI models and agent tool calls — the ingress layer paired with runtime sandboxes like [Daytona](https://www.daytona.io/docs/en/).

## 1. Workspace token

Create an API key in **Admin → API keys** (or **Operations → MCP**) with scopes `mask:write` and `events:write`. Use this token in MCP config and API calls.

## 2. Install MCP server (npm — recommended)

```bash
npm install -g @blekline/mcp-server@0.1.0
```

Set your workspace token:

```bash
export BLEKLINE_WORKSPACE_TOKEN="bl_live_..."
export BLEKLINE_API_URL="https://app.blekline.com"
```

## 3. Connect your client

| Priority | Client | Config |
|----------|--------|--------|
| P0 | Cursor | `.cursor/mcp.json` — see [Cursor](docs/mcp/cursor) |
| P1 | Claude Desktop | `config/claude-desktop.generated.json` — [Claude Desktop](docs/mcp/claude-desktop) |
| P2 | Codex | `.codex/config.toml` — [Codex](docs/mcp/codex) |

Generate configs from **Operations → MCP** in the app, or use the open-source repo scripts if you clone [blekline-oss](https://github.com/Blekline/blekline-oss).

## 4. Verify

In Cursor: **Settings → MCP** → **blekline** should show green with MCP tools (`blekline_mask_prompt`, etc.).

Optional API smoke:

```bash
curl -sS https://app.blekline.com/api/ready
```

## Contributors (monorepo)

If you develop Blekline from source:

```bash
git clone https://github.com/Blekline/blekline-oss.git
cd blekline-oss
pnpm install
pnpm build:packages
cp .env.example .env
pnpm generate:mcp-configs
pnpm demo:mcp-smoke
```

## Optional: browser extension

The [browser extension](docs/integrations/browser-extension) masks prompts in web UIs. **MCP is the primary path** for Cursor, Claude Desktop, and Codex — the extension is not required.
