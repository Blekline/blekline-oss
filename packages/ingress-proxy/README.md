# Blekline ingress edge sidecar

Regional HTTP proxy for OpenAI/Anthropic SDK base URL swaps, with **local** tool-call enforcement and optional edge pre-mask.

## Build & run

```bash
pnpm build:packages
pnpm docker:ingress
# or: docker build -t blekline-ingress -f packages/ingress-proxy/Dockerfile .

docker run -p 8787:8787 \
  -e BLEKLINE_INGRESS_TARGET=https://app.blekline.com \
  -e BLEKLINE_INGRESS_REGION=eu-central-1 \
  -e BLEKLINE_WORKSPACE_TOKEN=blw_... \
  -e BLEKLINE_WORKSPACE_ID=ws_... \
  -e BLEKLINE_EDGE_LOCAL_MASK=true \
  blekline-ingress
```

## Routes

| Route | Purpose |
|-------|---------|
| `GET /health` | Region + local mask p50/p95 |
| `POST /v1/enforce-tool-call` | Edge-local MCP policy (<10ms p99 target) |
| `POST /v1/chat/completions` | OpenAI-compatible → control plane ingress |
| `POST /v1/messages` | Anthropic-compatible → control plane ingress |

Pass through `x-blekline-workspace-token` and client metadata headers from your agent runtime.

## Helm

```bash
helm upgrade --install ingress-eu ./helm/blekline-ingress \
  --set env.BLEKLINE_INGRESS_REGION=eu-central-1 \
  --set secrets.workspaceToken=blw_... \
  --set secrets.workspaceId=ws_...
```

## Docs

- [Ingress proxy](../../webapp/content/docs/api/ingress-proxy.md)
- [Multi-region](../../webapp/content/docs/enterprise/multi-region.md)
- [Latency SLO](../../webapp/content/docs/reference/latency-slo.md)
