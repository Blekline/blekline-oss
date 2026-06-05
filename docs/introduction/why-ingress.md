---
title: Why ingress governance
description: Layer 4 control before Layer 5 autonomous agents.
---

# Why ingress governance

Enterprise teams turned on **Layer 5** — autonomous agents in Cursor, Claude Desktop, and Codex that call **MCP tools** without a human in the loop.

Most still lack **Layer 4** — an ingress control plane that decides what may enter models and sandboxes **before** execution.

## The gap

| Layer | What it is | Example |
|-------|------------|---------|
| **L5 — Agents** | Plan, call tools, write code | Cursor Agent, Devin-style workflows |
| **L4 — Ingress** | Mask, classify, enforce tool policy, audit | **Blekline** |
| **L3 — Runtime** | Isolated execution | [Daytona](https://www.daytona.io) sandboxes |
| **L2 — Models** | LLM APIs | Anthropic, OpenAI, Mistral |

Without L4, a single `tool_call` can exfiltrate an API key, run an unapproved shell command, or ship PII to a model provider — while the agent UI still looks “green.”

## What Blekline does at ingress

1. **Mask** prompts and payloads (cloud: Azure-backed PII; OSS: local secret scan for dev).
2. **Enforce** MCP tool policy — allow, mask, or block before downstream MCP (e.g. Daytona).
3. **Audit** metadata-oriented events per client surface (`cursor`, `claude-desktop`, `codex`).

## Open core

| You get in OSS | You buy in cloud |
|----------------|------------------|
| `@blekline/mcp-server`, `@blekline/mcp-proxy` | Fleet policy (SSE) |
| `@blekline/contracts` local enforce | Investigations |
| Docker / Helm ingress sidecar | Billing, enterprise support |

See the [architecture diagram](architecture) and [Daytona stack](../integrations/daytona-stack).
