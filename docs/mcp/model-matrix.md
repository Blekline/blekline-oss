---
title: Cursor model matrix
description: Manual QA checklist for MCP tools across Cursor providers and modes.
---

# Cursor model matrix

MCP in Cursor is **model-agnostic** — once Blekline MCP is green in Settings → MCP, every model can invoke tools.

## Thursday minimum (4 models)

| Provider | Model | Tool | Pass |
|----------|-------|------|------|
| Anthropic | Claude Opus | `blekline_mask_prompt` | [ ] |
| OpenAI | GPT-4o | `blekline_mask_prompt` | [ ] |
| OpenAI | Codex | `blekline_mask_prompt` | [ ] |
| Cursor | Composer | `blekline_mask_prompt` | [ ] |

## Full matrix

See repo checklist: `demo/cursor/model-matrix.md` (versioned QA log).

## Modes to verify

- **Agent** — proxy block demo with `blekline-proxy`
- **Composer** — mask prompt inline
- **Chat** — `blekline_classify_risk`

## Metadata verification

After each test, confirm dashboard event includes:

- `clientSurface: cursor`
- Optional `modelProvider` / `modelId` if client sends headers

## BYOK / Azure

MCP path unchanged; Phase 3 ingress proxy masks before customer Azure OpenAI route.
