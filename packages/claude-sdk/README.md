# @blekline/claude-sdk

Point **Claude Code** at Blekline ingress and reuse `@blekline/client` for prompt masking.

Silent auto-send applies on the **Messages ingress wire** (`ANTHROPIC_BASE_URL`). Claude.ai web chat is covered by the **browser extension**, not this package.

```bash
npm i @blekline/claude-sdk
```

```ts
import { anthropicIngressBaseUrl, createClaudeGovernanceClient } from "@blekline/claude-sdk";

process.env.ANTHROPIC_BASE_URL = anthropicIngressBaseUrl("https://app.blekline.com");

const blekline = createClaudeGovernanceClient({
  workspaceToken: process.env.BLEKLINE_WORKSPACE_TOKEN!,
});
await blekline.mask({ text: "Contact alice@corp.com" });
```

Claude Code:

```bash
export ANTHROPIC_BASE_URL="https://app.blekline.com/api/ingress/v1"
export BLEKLINE_WORKSPACE_TOKEN="blw_..."
```

Docs: [Claude Code](https://app.blekline.com/docs/mcp/claude-code)
