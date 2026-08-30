---
name: mask-text
description: Mask the current user text with blekline_mask_prompt before further tool use.
---

Call `blekline_mask_prompt` on the latest user message if it may contain PII or secrets. Continue only with the masked string.
