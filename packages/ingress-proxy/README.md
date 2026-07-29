# Blekline ingress sidecar (reference — open source)

Reference HTTP sidecar for **contracts-level** tool-call enforcement and model ingress. Trust Vault, Lineage Firewall, and the production NHIM image used in Track 02/03 are documented on [blekline.com](https://app.blekline.com/docs/deploy/docker-sidecar) — not built from this folder alone.

## Security (required)

| Variable | Default | Purpose |
|----------|---------|---------|
| `BLEKLINE_SIDECAR_AUTH` | *(required)* | Bearer token for `/v1/enforce-tool-call` |
| `BLEKLINE_LISTEN_HOST` | `127.0.0.1` | Bind address — use `0.0.0.0` only inside K8s pod network |
| `BLEKLINE_MAX_BODY_BYTES` | `1048576` | JSON body limit |

**Warning:** Never expose port 8787 via public Ingress.

## Build & run (reference sidecar)

For local enforcement trials or fork/audit — **not** the default Track 02/03 path (use `ghcr.io/blekline/sidecar` per [Docker sidecar](https://app.blekline.com/docs/deploy/docker-sidecar)).

```bash
pnpm build:packages
docker build -f packages/ingress-proxy/Dockerfile.oss -t blekline-ingress-oss .
docker run -p 127.0.0.1:8787:8787 \
  -e BLEKLINE_SIDECAR_AUTH=your-secret \
  -e BLEKLINE_LISTEN_HOST=0.0.0.0 \
  blekline-ingress-oss
```

NHIM image (Trust Vault + Lineage): [Docker sidecar](https://app.blekline.com/docs/deploy/docker-sidecar) · [Trust Vault sidecar](https://app.blekline.com/docs/enterprise/trust-vault-sidecar)

## Routes (reference sidecar)

| Route | Auth | Purpose |
|-------|------|---------|
| `GET /health` | No | Sidecar status |
| `POST /v1/enforce-tool-call` | Bearer | MCP policy (contracts) |
| `POST /v1/vault/tokenize` | Bearer | Use NHIM sidecar image |
| `POST /v1/vault/hydrate` | Bearer | Use NHIM sidecar image |
| `POST /v1/lineage/contaminate` | Bearer | Use NHIM sidecar image |
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

## Open source scope

This package publishes **reference** sidecar source and Helm layout for contracts enforcement. The NHIM sidecar image used in platform eval is distributed separately — see deploy docs on [app.blekline.com](https://app.blekline.com/docs/deploy/docker-sidecar).
