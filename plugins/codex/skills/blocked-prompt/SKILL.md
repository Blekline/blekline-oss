---
name: blocked-prompt
description: After a Codex hook block, do not reconstruct secrets. Silent auto-send is ingress Responses.
---

# Blocked prompt

When Blekline blocks `UserPromptSubmit`:

1. Explain that native Codex hooks block or add context — they do not rewrite the prompt for silent auto-send.
2. Silent auto-send requires Blekline **ingress** on the OpenAI **Responses** API.
3. Never reconstruct secrets from memory.
