---
title: MCP Server
description: blekline-mcp-server tools and env vars.
---

# MCP Server

Package: `@blekline/mcp-server`

| Tool | API |
|------|-----|
| `blekline_mask_prompt` | POST /api/mask |
| `blekline_classify_risk` | POST /api/policy/simulate |
| `blekline_emit_event` | POST /api/events |

Env:

- `BLEKLINE_API_URL`
- `BLEKLINE_WORKSPACE_TOKEN`
- `BLEKLINE_CLIENT_SURFACE` — `cursor` | `claude-desktop` | `codex`
