---
name: mask-prompt
description: Mask user text with PII or secrets before Codex tools or the model see it.
---

# Mask prompt

Call `blekline_mask_prompt` before forwarding user text that may contain secrets or PII.

If `UserPromptSubmit` blocked the turn, do not reconstruct secrets. Native Codex hooks do not silently auto-send a rewritten prompt — that path is Blekline ingress on the OpenAI Responses API.
