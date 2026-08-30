---
name: mask-prompt
description: Mask user text with PII or secrets before tools, subagents, or the model see it.
---

# Mask prompt

Before forwarding user-supplied text that may contain emails, phones, API keys, or customer data:

1. Call the `blekline_mask_prompt` MCP tool (server `blekline`).
2. Use only the masked result downstream.
3. If Cursor hooks blocked Send, ask the user to paste the clipboard masked version — do not reconstruct secrets.

Workspace token stays in `.blekline/cursor.json` or MCP env as `blw_...` (never commit live tokens).
