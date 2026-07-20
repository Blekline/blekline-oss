# Blekline NHIM sidecar (`ingress-proxy`)

Regional HTTP proxy for OpenAI/Anthropic SDK base URL swaps, with **authenticated** tool-call enforcement, Trust Vault, and Lineage Firewall.

## Security (required)

| Variable | Default | Purpose |
|----------|---------|---------|
| `BLEKLINE_SIDECAR_AUTH` | *(required)* | Bearer token for `/v1/enforce-tool-call`, vault, lineage APIs |
| `BLEKLINE_LISTEN_HOST` | `127.0.0.1` | Bind address — use `0.0.0.0` only inside K8s pod network |
| `BLEKLINE_MAX_BODY_BYTES` | `1048576` | JSON body limit |
| `BLEKLINE_FAILURE_MODE` | `block` | `passthrough_with_alert` for staging only |

**Warning:** Never expose port 8787 via public Ingress. ClusterIP + agent pod only.

## Build & run

```bash
pnpm build:packages
pnpm docker:sidecar
# Image tag: blekline-sidecar:0.2.0-nhim

bash scripts/local-sidecar-env.sh   # docker compose, <30s
```

```bash
docker run -p 127.0.0.1:8787:8787 \
  -e BLEKLINE_SIDECAR_AUTH=your-secret \
  -e BLEKLINE_VAULT_MASTER_KEY=0123...64hex \
  -e BLEKLINE_LISTEN_HOST=0.0.0.0 \
  blekline-sidecar:0.2.0-nhim
```

## Routes

| Route | Auth | Purpose |
|-------|------|---------|
| `GET /health` | No | Sidecar status |
| `POST /v1/enforce-tool-call` | Bearer | MCP policy + lineage |
| `POST /v1/vault/tokenize` | Bearer | Trust Vault placeholder |
| `POST /v1/vault/hydrate` | Bearer | In-cluster hydrate |
| `POST /v1/lineage/contaminate` | Bearer | Pilot/test contamination |
| `POST /v1/chat/completions` | Upstream token | OpenAI-compatible ingress |
| `POST /v1/messages` | Upstream token | Anthropic-compatible ingress |

## Helm

```bash
helm upgrade --install sidecar ./helm/blekline-ingress \
  --set trustVault.enabled=true \
  --set replicaCount=1 \
  --set failureMode=block \
  --set secrets.existingSecret=blekline-sidecar-secret
```

Create secrets with `kubectl create secret` — do not commit tokens in `values.yaml`.

## Docs

- [NHIM overview](https://app.blekline.com/docs/introduction/nhim)
- [Trust Vault sidecar](https://app.blekline.com/docs/enterprise/trust-vault-sidecar)
- [Ingress proxy API](https://app.blekline.com/docs/api/ingress-proxy)

## OSS boundary

This package is open source. Trust Vault / Lineage **source** lives in private `runtime-engine` (compiled into the Docker image only).
