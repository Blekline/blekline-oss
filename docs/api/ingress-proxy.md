# Universal ingress proxy

Blekline provides OpenAI- and Anthropic-compatible ingress routes that **mask user messages** before forwarding to upstream model APIs.

## Routes

| Provider | Blekline route | Upstream |
|----------|----------------|----------|
| OpenAI | `POST /api/ingress/v1/chat/completions` | `OPENAI_API_BASE` (default `https://api.openai.com/v1`) |
| Anthropic | `POST /api/ingress/v1/messages` | `https://api.anthropic.com/v1/messages` |

Configure server env:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
# optional
OPENAI_API_BASE=https://api.openai.com/v1
BLEKLINE_INGRESS_BLOCK_HIGH_RISK=true
```

## SDK base URL swap

Point your OpenAI SDK at Blekline:

```python
from openai import OpenAI
client = OpenAI(
    base_url="https://app.blekline.com/api/ingress/v1",
    api_key=os.environ["BLEKLINE_WORKSPACE_TOKEN"],
    default_headers={
        "x-blekline-workspace-token": os.environ["BLEKLINE_WORKSPACE_TOKEN"],
        "x-blekline-client-surface": "sdk",
    },
)
```

## Docker sidecar

For on-prem or Daytona stacks, run the sidecar next to your agent runtime:

```bash
docker build -t blekline-ingress packages/ingress-proxy
docker run -e BLEKLINE_INGRESS_TARGET=https://app.blekline.com \
  -e LISTEN_PORT=8787 -p 8787:8787 blekline-ingress
```

Point SDKs at `http://localhost:8787/v1`.

## Enforcement

- User/system message text is scanned and masked inline.
- High-risk secrets (AWS keys, OpenAI keys, JWT, SSN, etc.) can **block** the request (`403`) when `BLEKLINE_INGRESS_BLOCK_HIGH_RISK` is not `false`.
- Each proxied call emits an `ingress_proxy` event with model metadata for the dashboard.
