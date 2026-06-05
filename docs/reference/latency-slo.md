---
title: Latency SLO
description: Enterprise ingress latency targets and measurement.
---

# Latency SLO

Blekline ingress is **not** a sandbox runtime. Compare apples to apples:

| Layer | Product | Metric | Target |
|-------|---------|--------|--------|
| Runtime | Daytona | Sandbox create | **<80ms** (vendor) |
| Ingress | Blekline | Tool-call policy (local) | **p99 <10ms** |
| Ingress | Blekline | Fast-path mask (local) | **p95 <20ms** |
| Ingress | Blekline | Authoritative mask (Azure) | **p95 <500ms** |

## Fast-path modes

Set `BLEKLINE_MASK_FAST_PATH`:

| Mode | Behavior |
|------|----------|
| `azure_first` | Default — always call Azure after local prep |
| `local_first` | Skip Azure when local pass is clean (no names/PHI heuristic) |
| `local_only` | Never call Azure — edge/regional agents |

Per-request override: header `x-blekline-mask-fast-path: local_first`

## Response headers

| Header | Meaning |
|--------|---------|
| `x-blekline-latency-ms` | Total mask request time |
| `x-blekline-mask-path` | `azure_first` / `local_first` / `local_only` |
| `x-blekline-ingress-region` | Edge region label |
| `x-blekline-mask-phase` | `fast_local`, `completed`, `fallback_local` |

## Benchmark

```bash
pnpm build:packages
pnpm demo:latency
# with token:
BLEKLINE_WORKSPACE_TOKEN=blw_... BLEKLINE_API_URL=http://localhost:3000 pnpm demo:latency
```

## Health probe

```bash
curl http://localhost:3000/api/health/ingress
```

Edge sidecar:

```bash
curl http://localhost:8787/health
```

## MCP proxy hot path

```bash
BLEKLINE_PROXY_LOCAL_ONLY=1
```

Cloud enforce runs async for audit; agent path stays local.
