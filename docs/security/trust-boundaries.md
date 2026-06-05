---
title: Trust Boundaries
description: Current-state data handling for enterprise diligence.
---

# Trust Boundaries

- Masking is **not local-only** — requests go to Blekline `/api/mask` and Azure PII services.
- Standard event payloads are **metadata-only** (no raw prompt text in Activity).
- MCP tool enforcement logs action, tool name, entity counts — not full argument bodies in persisted events.

Evaluate Blekline as a policy-enforced ingress control plane with explicit backend boundaries.
