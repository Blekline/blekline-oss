# Client QA matrix

MCP is model-agnostic. After connecting Blekline, verify these models invoke tools per surface:

| Surface | Provider | Model | Tool | Pass |
|---------|----------|-------|------|------|
| Cursor | Anthropic | Claude Opus | blekline_mask_prompt | [ ] |
| Cursor | OpenAI | GPT-4o | blekline_mask_prompt | [ ] |
| Cursor | Cursor | Composer | blekline_mask_prompt | [ ] |
| Claude Code | Anthropic | Claude Sonnet | blekline_evaluate_tool_call | [ ] |
| Claude Desktop | Anthropic | Claude | blekline_mask_prompt | [ ] |
| Codex | OpenAI | Codex | blekline_mask_prompt | [ ] |
| Copilot | GitHub | Copilot agent | blekline_mask_prompt | [ ] |
| Any + proxy | Any | Any | run_shell block | [ ] |

Index: [`integrations/README.md`](../../integrations/README.md)

Docs: [Agent clients](https://app.blekline.com/docs/integrations/agent-clients)
