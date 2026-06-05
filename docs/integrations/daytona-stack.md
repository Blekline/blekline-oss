---
title: Daytona Stack
description: Blekline ingress + Daytona runtime reference architecture.
---

# Daytona + Blekline Stack

| Layer | Product | Role |
|-------|---------|------|
| Ingress | Blekline | Mask prompts, classify risk, govern MCP tool calls |
| Runtime | Daytona | Isolated sandbox, code execution, MCP agent tools |

## Wiring

1. Connect `@blekline/mcp-proxy` in Cursor / Claude / Codex
2. Set `BLEKLINE_DOWNSTREAM_MCP_COMMAND` to Daytona MCP server
3. Provide `DAYTONA_API_KEY`

Flow: Agent → Blekline proxy (scan/mask/block) → Daytona MCP → sandbox.

See [Daytona documentation](https://www.daytona.io/docs/en/) for sandbox SDK and MCP server setup.
