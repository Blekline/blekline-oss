---
name: mcp-proxy
description: Route downstream MCP tools through blekline-proxy for argument policy checks.
---

# MCP proxy

Prefer `blekline-proxy` for third-party MCP tools. If PreToolUse denies a call, stop. Do not retry with the same secrets in arguments.
