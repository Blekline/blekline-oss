# @blekline/client

TypeScript SDK for the Blekline execution platform (policy, runs, mask, enforce).

## Install

```bash
pnpm add @blekline/client
```

## Usage — act run

```ts
import { BleklineClient } from "@blekline/client";

const client = new BleklineClient({
  workspaceToken: process.env.BLEKLINE_WORKSPACE_TOKEN!,
  metadata: { clientSurface: "sdk" },
});

const { run } = await client.createCellRun({
  workflowId: "wf_your_workflow_id",
  executionTier: "act",
  toolCall: true,
});

const listed = await client.listCellRuns({ limit: 10 });
```

## Ingress helpers

```ts
const mask = await client.mask({ text: "Contact alice@corp.com", platform: "SDK" });
const tool = await client.enforceToolCall({
  toolName: "run_terminal_cmd",
  arguments: { command: "echo hello" },
});
```

## Docs

- [SDK client](https://app.blekline.com/docs/sdk-client)
- [Workflows and runs](https://app.blekline.com/docs/workflows-and-runs)
- [API overview](https://app.blekline.com/docs/api/overview)