---
name: mcp-proxy
description: Route downstream MCP tool calls through blekline-proxy so arguments are policy-checked.
---

# MCP proxy

When the user enables tool governance:

1. Prefer the `blekline-proxy` MCP server for third-party tools.
2. Do not send secrets in tool arguments; mask first.
3. If `beforeMCPExecution` denies a call, stop and explain the block — do not retry with the same secrets.
