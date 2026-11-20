"""LangChain-oriented helpers (no hard dependency on langchain-core)."""

from __future__ import annotations

from typing import Any, Callable, TypeVar

from blekline_client import BleklineClient

T = TypeVar("T", bound=dict[str, Any])


def mask_prompt(client: BleklineClient, text: str, *, platform: str = "langchain") -> dict[str, Any]:
    return client.mask(text=text, platform=platform)


def enforce_tool_call(
    client: BleklineClient,
    tool_name: str,
    arguments: dict[str, Any],
    *,
    platform: str = "langchain",
) -> dict[str, Any]:
    return client.enforce_tool_call(tool_name=tool_name, arguments=arguments, platform=platform)


def with_tool_guard(
    client: BleklineClient,
    tool_name: str,
    handler: Callable[[T], Any],
    *,
    platform: str = "langchain",
) -> Callable[[T], Any]:
    def wrapped(args: T) -> Any:
        decision = enforce_tool_call(client, tool_name, dict(args), platform=platform)
        if decision.get("action") == "block":
            raise RuntimeError(f"Blekline blocked tool call: {tool_name}")
        if decision.get("action") == "mask" and decision.get("maskedArguments"):
            return handler(decision["maskedArguments"])  # type: ignore[arg-type]
        return handler(args)

    return wrapped