# @blekline/client-hooks

Shared local-mask helpers and operator-facing notice strings used by Blekline IDE hooks.

Apache-2.0. Does **not** implement Cursor or Codex lifecycle adapters — those live in `@blekline/cursor-hooks` and `@blekline/codex-hooks`.

## Exports

- `maskPromptLocally` / `localMaskRequestId` — in-process secret labels (same as `@blekline/contracts`)
- Notice constants for clipboard paste, no silent auto-send, and Codex ingress Responses
- `buildBlockUserMessage` — block copy shown when native chat cannot rewrite in place

```js
import { NOTICE_CURSOR_NO_SILENT_AUTO_SEND, maskPromptLocally } from "@blekline/client-hooks";
```

Placeholder tokens only: `blw_...`.
