# Python SDK

Install from the monorepo:

```bash
pip install -e packages/client-python
```

## Quick start

```python
import os
from blekline_client import BleklineClient

client = BleklineClient(
    workspace_token=os.environ["BLEKLINE_WORKSPACE_TOKEN"],
    base_url="https://app.blekline.com",
    client_surface="sdk",
)

masked = client.mask(text="Email alice@corp.com my SSN 123-45-6789", platform="Python")
print(masked["maskedText"], masked.get("decision"))

tool = client.enforce_tool_call(
    tool_name="write_file",
    arguments={"path": "/tmp/out.txt", "content": "sk-proj-abc123"},
)
print(tool["action"], tool["entitiesMasked"])
```

## Methods

| Method | API |
|--------|-----|
| `mask(text=, platform=)` | `POST /api/mask` |
| `emit_event(...)` | `POST /api/events` |
| `enforce_tool_call(...)` | `POST /api/mcp/enforce-tool-call` |
| `simulate_policy(...)` | `POST /api/policy/simulate` |

## Errors

Raises `BleklineApiError` with `.status` on HTTP failures.

See also: [OpenAPI spec](docs/api/openapi) and [TypeScript SDK](docs/sdk/typescript).
