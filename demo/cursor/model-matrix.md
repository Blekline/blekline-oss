# Cursor model QA matrix

MCP is model-agnostic. After connecting Blekline MCP, verify these models invoke tools:

| Provider | Model | Tool | Pass |
|----------|-------|------|------|
| Anthropic | Claude Opus | blekline_mask_prompt | [ ] |
| Anthropic | Claude Sonnet | blekline_classify_risk | [ ] |
| OpenAI | GPT-4o | blekline_mask_prompt | [ ] |
| OpenAI | Codex | blekline_mask_prompt | [ ] |
| Cursor | Composer | blekline_mask_prompt | [ ] |
| Any | Any + blekline-proxy | run_shell block | [ ] |

Modes: Agent, Composer, Chat — all should expose MCP tools when server is green in Cursor Settings → MCP.
