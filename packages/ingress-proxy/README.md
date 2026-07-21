# Blekline ingress sidecar (OSS shell)

Regional HTTP proxy for OpenAI/Anthropic SDK base URL swaps, with **authenticated** tool-call enforcement via `@blekline/contracts`.

Trust Vault, Lineage Firewall, and the NHIM sidecar image are **enterprise** — see [K8s deployment](https://app.blekline.com/docs/enterprise/k8s-deployment).

## Security (required)

| Variable | Default | Purpose |
|----------|---------|---------|
| `BLEKLINE_SIDECAR_AUTH` | *(required)* | Bearer token for `/v1/enforce-tool-call` |
| `BLEKLINE_LISTEN_HOST` | `127.0.0.1` | Bind address — use `0.0.0.0` only inside K8s pod network |
| `BLEKLINE_MAX_BODY_BYTES` | `1048576` | JSON body limit |

**Warning:** Never expose port 8787 via public Ingress.

## Build & run (OSS shell)

```bash
pnpm build:packages
docker build -f packages/ingress-proxy/Dockerfile.oss -t blekline-ingress-oss .
docker run -p 127.0.0.1:8787:8787 \
  -e BLEKLINE_SIDECAR_AUTH=your-secret \
  -e BLEKLINE_LISTEN_HOST=0.0.0.0 \
  blekline-ingress-oss
```

NHIM image (Trust Vault + Lineage): contact enterprise@blekline.com or see [Trust Vault sidecar](https://app.blekline.com/docs/enterprise/trust-vault-sidecar).

## Routes (OSS shell)

| Route | Auth | Purpose |
|-------|------|---------|
| `GET /health` | No | Sidecar status |
| `POST /v1/enforce-tool-call` | Bearer | MCP policy (contracts) |
| `POST /v1/vault/tokenize` | Bearer | Returns `NHIM_IMAGE_REQUIRED` |
| `POST /v1/vault/hydrate` | Bearer | Returns `NHIM_IMAGE_REQUIRED` |
| `POST /v1/lineage/contaminate` | Bearer | Returns `NHIM_IMAGE_REQUIRED` |
| `POST /v1/chat/completions` | Upstream token | OpenAI-compatible ingress |
| `POST /v1/messages` | Upstream token | Anthropic-compatible ingress |

## Helm

```bash
helm upgrade --install sidecar ./helm/blekline-ingress \
  --set trustVault.enabled=false \
  --set lineage.enabled=false \
  --set replicaCount=1 \
  --set failureMode=block
```

Create secrets with `kubectl create secret` — do not commit tokens in `values.yaml`.

## Docs

- [NHIM overview](https://app.blekline.com/docs/introduction/nhim)
- [K8s deployment](https://app.blekline.com/docs/enterprise/k8s-deployment)
- [Ingress proxy API](https://app.blekline.com/docs/api/ingress-proxy)

## OSS boundary

This package is open source (contracts-only shell). Trust Vault / Lineage **source** is private — compiled only into the NHIM Docker image, not this repository.
