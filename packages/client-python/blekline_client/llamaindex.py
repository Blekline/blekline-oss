"""LlamaIndex-oriented helpers (no hard dependency on llama-index)."""

from __future__ import annotations

from typing import Any

from blekline_client import BleklineClient
from blekline_client.langchain import enforce_tool_call, mask_prompt, with_tool_guard

__all__ = ["mask_prompt", "enforce_tool_call", "with_tool_guard", "guard_tool_call"]


def guard_tool_call(
    client: BleklineClient,
    tool_name: str,
    arguments: dict[str, Any],
    *,
    platform: str = "llamaindex",
) -> dict[str, Any]:
    """Return masked arguments dict when policy action is mask; raise when block."""
    decision = enforce_tool_call(client, tool_name, arguments, platform=platform)
    if decision.get("action") == "block":
        raise RuntimeError(f"Blekline blocked tool call: {tool_name}")
    if decision.get("action") == "mask" and decision.get("maskedArguments"):
        return decision["maskedArguments"]
    return arguments