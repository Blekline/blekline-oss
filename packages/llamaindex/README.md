# @blekline/llamaindex

Official LlamaIndex (TypeScript) helpers. Re-exports Blekline guard utilities with LlamaIndex-oriented names.

## Install

```bash
npm install @blekline/client @blekline/llamaindex
```

## Usage

```typescript
import { BleklineClient } from "@blekline/client";
import { withBleklineLlamaIndexToolGuard } from "@blekline/llamaindex";

const client = new BleklineClient({ workspaceToken: process.env.BLEKLINE_WORKSPACE_TOKEN! });

const safeTool = withBleklineLlamaIndexToolGuard(client, "retriever", async (args) => query(args));
```

For Python LlamaIndex, use `blekline_client.llamaindex` from `blekline-client[llamaindex]`.