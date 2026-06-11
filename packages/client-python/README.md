# @blekline/client (Python)

Enterprise Python SDK for the Blekline ingress control plane.

## Install

```bash
pip install -e packages/client-python
```

## Usage

```python
from blekline_client import BleklineClient

client = BleklineClient(
    workspace_token="ws_...",
    base_url="https://app.blekline.com",
    client_surface="sdk",
)

result = client.mask(text="Contact me at alice@corp.com", platform="Python")
print(result["maskedText"])

decision = client.enforce_tool_call(
    tool_name="run_command",
    arguments={"cmd": "curl https://api.example.com"},
)
print(decision["action"])
```

See OpenAPI spec: `packages/contracts/openapi.yaml`.

## Tests

Requires **Python 3.10+**.

```bash
python -m pip install --upgrade pip
pip install -e ".[dev]"
pytest tests -q
```

From repo root: `pnpm test:python`
