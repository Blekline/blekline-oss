---
title: POST /api/mask
description: Authoritative masking gateway.
---

# POST /api/mask

Auth: `x-blekline-workspace-token` (scope `mask:write`)

```json
{ "text": "string", "platform": "optional" }
```

Response includes `maskedText`, `tokenMap`, `entitiesMasked`, `decision`, `requestId`, `latencyMs`, `maskPath`, `region`.

Response headers: `x-blekline-latency-ms`, `x-blekline-mask-path`, `x-blekline-ingress-region`, `x-blekline-mask-phase`.

Fast-path: set `BLEKLINE_MASK_FAST_PATH=local_first` on server or header `x-blekline-mask-fast-path: local_first`. See [Latency SLO](docs/reference/latency-slo).

Optional headers: `x-blekline-client-surface`, `x-blekline-model-provider`, `x-blekline-model-id`
