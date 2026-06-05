---
title: Architecture
description: Ingress control plane vs runtime sandbox.
---

# Architecture

## System view

```mermaid
flowchart TB
  subgraph clients["Agent clients (L5)"]
    C[Cursor]
    CL[Claude Desktop]
    CX[Codex]
  end

  subgraph ingress["Blekline ingress (L4)"]
    MS["@blekline/mcp-server"]
    MP["@blekline/mcp-proxy"]
    CP["Control plane /api/*"]
  end

  subgraph runtime["Runtime (L3)"]
    D[Daytona MCP + sandbox]
  end

  subgraph models["Models (L2)"]
    M[Anthropic / OpenAI / …]
  end

  C --> MS
  CL --> MS
  CX --> MS
  C --> MP
  MP --> MS
  MS --> CP
  MP --> CP
  CP --> M
  MP --> D
```

## ASCII (copy-paste friendly)

```text
[ Cursor | Claude Desktop | Codex ]     Layer 5 — agents
           │ MCP stdio / SSE
           ▼
[ @blekline/mcp-server | @blekline/mcp-proxy ]   Layer 4 — ingress
           │ HTTPS  mask · enforce-tool-call · events
           ▼
[ Blekline control plane — app.blekline.com ]
           ├──────────────► [ Model providers ]          Layer 2
           └──────────────► [ Daytona — approved tools ] Layer 3
```

**Blekline = ingress governance.** **Daytona = runtime isolation.** Together they form the enterprise AI stack.

## Trust & diligence

- [Trust boundaries](../security/trust-boundaries) — what leaves the client, what is metadata-only in audit.
- [MCP identity pinning](../security/mcp-identity-pinning) — downstream server attestation.
- [Latency SLO](../reference/latency-slo) — enforce path p99 targets.

Masking in production uses Blekline backend + Azure PII (not local-only). OSS `contracts` supports **offline dev** secret scan and local tool policy without a token.
