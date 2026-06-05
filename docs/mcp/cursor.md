---
title: Cursor
description: P0 — MCP setup for all Cursor models and modes.
---

# Cursor MCP Setup

Config: `.cursor/mcp.json` (committed in repo).

1. `pnpm build:packages`
2. Set `BLEKLINE_API_URL` and `BLEKLINE_WORKSPACE_TOKEN` in your environment
3. Reload Cursor (Cmd+Shift+P → Developer: Reload Window)
4. Settings → MCP → verify **blekline** (3 tools) and **blekline-proxy**

Works in **Agent**, **Composer**, and **Chat** with all models (Claude, GPT, Codex, Gemini, Composer, Auto).

See `demo/cursor/model-matrix.md` for enterprise QA checklist.
