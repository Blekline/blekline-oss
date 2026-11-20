#!/usr/bin/env python3
"""First act run — requires published policy and runs:write token."""
from __future__ import annotations

import os
import sys

from blekline_client import BleklineClient


def main() -> int:
    token = (os.environ.get("BLEKLINE_WORKSPACE_TOKEN") or "").strip()
    workflow_id = (os.environ.get("BLEKLINE_WORKFLOW_ID") or "").strip()
    if not token:
        print("Set BLEKLINE_WORKSPACE_TOKEN=blw_... (runs:write scope)", file=sys.stderr)
        return 1
    if not workflow_id.startswith("wf_"):
        print("Set BLEKLINE_WORKFLOW_ID=wf_... (create a workflow in Console first)", file=sys.stderr)
        return 1

    base = (os.environ.get("BLEKLINE_API_URL") or "https://app.blekline.com").strip()
    client = BleklineClient(base_url=base, workspace_token=token, client_surface="sdk")
    try:
        result = client.create_cell_run(
            workflow_id=workflow_id,
            display_name="First act run (OSS Python example)",
            execution_tier="act",
            tool_call=True,
        )
        run = result.get("run") or result
        print("run:", run.get("id"), "compileHash:", run.get("compileHash"))
    except Exception as exc:  # noqa: BLE001 — example exits with message
        print(f"create_cell_run failed: {exc}", file=sys.stderr)
        print("See https://app.blekline.com/docs/workflows-and-runs", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())