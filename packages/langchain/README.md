# @blekline/langchain

Official LangChain.js helpers for Blekline prompt mask and tool-call enforcement.

## Install

```bash
npm install @blekline/client @blekline/langchain
```

## Usage

```typescript
import { BleklineClient } from "@blekline/client";
import { maskPromptForChain, withBleklineToolGuard } from "@blekline/langchain";

const client = new BleklineClient({ workspaceToken: process.env.BLEKLINE_WORKSPACE_TOKEN! });

const masked = await maskPromptForChain(client, userText);
const safeTool = withBleklineToolGuard(client, "search", async (args) => search(args));
```

Wire `safeTool` into LangChain `DynamicStructuredTool` or agent tool lists.