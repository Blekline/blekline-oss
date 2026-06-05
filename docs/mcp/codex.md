---
title: Codex
description: P2 — Codex app TOML MCP configuration.
---

# Codex App

Codex uses **TOML**, not JSON. Project config: `.codex/config.toml`.

```bash
pnpm generate:mcp-configs
```

Trust the project in Codex, then restart session. Tools appear under MCP servers.

CLI alternative:

```bash
codex mcp add blekline -- node packages/mcp-server/dist/index.js
```

Reference: [Codex MCP configuration](https://openai-codex.mintlify.app/configuration/mcp-servers)
