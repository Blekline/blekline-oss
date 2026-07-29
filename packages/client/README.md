# @blekline/client

TypeScript SDK for the Blekline ingress control plane.

## Install

```bash
pnpm add @blekline/client
```

Monorepo: `"@blekline/client": "workspace:*"`

## Usage

```ts
import { BleklineClient } from "@blekline/client";

const client = new BleklineClient({
  workspaceToken: process.env.BLEKLINE_WORKSPACE_TOKEN!,
  metadata: { clientSurface: "sdk" },
});

const mask = await client.mask({ text: "Contact alice@corp.com", platform: "SDK" });
const tool = await client.enforceToolCall({
  toolName: "run_terminal_cmd",
  arguments: { command: "echo hello" },
});
```

## Methods

- `mask()` → `POST /api/mask`
- `emitEvent()` → `POST /api/events`
- `simulatePolicy()` → `POST /api/policy/simulate`
- `enforceToolCall()` → `POST /api/mcp/enforce-tool-call`

## Docs

- [TypeScript SDK](https://app.blekline.com/docs/sdk/typescript)
- [OpenAPI](https://app.blekline.com/docs/api/openapi)
- [Eval journey](https://app.blekline.com/docs/get-started/eval-journey)
