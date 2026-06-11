# Blekline CLI / headless

Run Blekline without an IDE — smoke tests, SDK agents, and CI gates.

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
python examples/python-sdk-agent/main.py
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

Docs: [Quick start](https://app.blekline.com/docs/introduction/quick-start)
