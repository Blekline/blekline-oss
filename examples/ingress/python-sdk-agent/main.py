"""Blekline Python SDK example — requires live workspace token."""

from __future__ import annotations

import os
import sys

from blekline_client import BleklineClient

token = os.environ.get("BLEKLINE_WORKSPACE_TOKEN", "").strip()
if not token:
    print("Set BLEKLINE_WORKSPACE_TOKEN=blw_...", file=sys.stderr)
    sys.exit(1)

client = BleklineClient(
    base_url=os.environ.get("BLEKLINE_API_URL", "https://app.blekline.com").strip(),
    workspace_token=token,
    client_surface="sdk",
)

sample = "Contact jane@acme.com — key AKIAIOSFODNN7EXAMPLE"
result = client.mask(text=sample, platform="python-sdk-example")
masked = result.get("maskedText") or result
print("masked:", str(masked)[:120])
