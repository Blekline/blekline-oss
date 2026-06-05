---
title: TypeScript SDK
description: @blekline/client REST wrapper.
---

# TypeScript SDK

```typescript
import { BleklineClient } from "@blekline/client";

const client = new BleklineClient({
  baseUrl: "https://app.blekline.com",
  workspaceToken: process.env.BLEKLINE_WORKSPACE_TOKEN!,
  metadata: { clientSurface: "sdk" },
});

const { maskedText, decision } = await client.mask({
  text: "Contact john@acme.com",
  platform: "MyApp",
});
```

Methods: `mask`, `emitEvent`, `simulatePolicy`, `enforceToolCall`.
