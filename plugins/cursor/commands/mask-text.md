---
name: mask-text
description: Mask the current user text with blekline_mask_prompt before any further tool use.
---

Call `blekline_mask_prompt` on the latest user message if it may contain PII or secrets. Continue only with the masked string. If the MCP tool is unavailable, tell the user to configure `BLEKLINE_WORKSPACE_TOKEN` (`blw_...`) and retry.
