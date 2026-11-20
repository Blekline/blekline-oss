# Blekline CLI / headless

Run Blekline without an IDE — smoke tests, SDK agents, and CI gates.

## First act on Blekline (hosted cells)

```bash
export BLEKLINE_WORKSPACE_TOKEN="blw_..."
export BLEKLINE_API_URL="https://app.blekline.com"
npx @blekline/init
node examples/cells/first-act-run/index.mjs
```

Docs: [Workflows and runs](https://app.blekline.com/docs/workflows-and-runs) · [Runtime policy](https://app.blekline.com/docs/runtime-policy)

## Quick smoke

```bash
pnpm install
pnpm build:packages
export BLEKLINE_WORKSPACE_TOKEN="blw_..."
export BLEKLINE_API_URL="https://app.blekline.com"
export BLEKLINE_CLIENT_SURFACE="sdk"
pnpm demo:mcp-smoke
```

## npx (no clone)

```bash
export BLEKLINE_WORKSPACE_TOKEN="blw_..."
export BLEKLINE_API_URL="https://app.blekline.com"
export BLEKLINE_CLIENT_SURFACE="sdk"
npx -y @blekline/mcp-server
```

## Python (headless SDK)

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -e packages/client-python
export BLEKLINE_WORKSPACE_TOKEN="blw_..."
export BLEKLINE_API_URL="https://app.blekline.com"
python examples/ingress/python-sdk-agent/main.py
```

Unit tests (no token): `pip install -e "packages/client-python[dev]" && pytest packages/client-python/tests -q`

## SDK

- TypeScript: [`packages/client`](../packages/client)
- Python: [`packages/client-python`](../packages/client-python)
- Examples: [`examples/`](../examples/)

## Verify

```bash
pnpm verify:integrations
```

## Optional: cluster posture (K8s)

Static scan before connected compute. No workspace token:

```bash
npx @blekline/cluster-posture audit --profile generic --plain --json -o cluster-posture.json
```

Docs: [Cluster security and posture](https://app.blekline.com/docs/operate/security)

## SDK packages
