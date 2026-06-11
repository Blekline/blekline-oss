"""Blekline Python SDK — ingress control plane client."""

from __future__ import annotations

from typing import Any, Literal, Optional

import httpx

ClientSurface = Literal[
    "cursor",
    "claude-desktop",
    "claude-code",
    "codex",
    "continue",
    "github-copilot",
    "openhands",
    "sourcegraph-cody",
    "sdk",
    "extension",
    "unknown",
]
EnforcementAction = Literal["allow", "mask", "block"]


class BleklineApiError(Exception):
    def __init__(self, message: str, *, status: int | None = None) -> None:
        super().__init__(message)
        self.status = status


class BleklineClient:
    def __init__(
        self,
        *,
        workspace_token: str,
        base_url: str = "https://app.blekline.com",
        workspace_id: str | None = None,
        client_surface: ClientSurface = "sdk",
        timeout: float = 60.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.workspace_token = workspace_token
        self.workspace_id = workspace_id
        self.client_surface = client_surface
        self.timeout = timeout

    def _headers(self) -> dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "x-blekline-workspace-token": self.workspace_token,
            "x-blekline-client-surface": self.client_surface,
        }
        if self.workspace_id:
            headers["x-blekline-workspace-id"] = self.workspace_id
        return headers

    def _request(self, method: str, path: str, json: dict[str, Any] | None = None) -> Any:
        with httpx.Client(base_url=self.base_url, timeout=self.timeout) as client:
            resp = client.request(method, path, headers=self._headers(), json=json)
            if resp.status_code >= 400:
                detail = resp.text[:500]
                raise BleklineApiError(detail or f"HTTP {resp.status_code}", status=resp.status_code)
            return resp.json()

    def mask(self, *, text: str, platform: str = "SDK") -> dict[str, Any]:
        return self._request("POST", "/api/mask", {"text": text, "platform": platform})

    def emit_event(
        self,
        *,
        kind: str,
        platform: str,
        entities_masked: int = 0,
        risk_tier: Optional[str] = None,
        action: Optional[str] = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "kind": kind,
            "platform": platform,
            "entitiesMasked": entities_masked,
            "clientSurface": self.client_surface,
        }
        if risk_tier:
            payload["riskTier"] = risk_tier
        if action:
            payload["action"] = action
        return self._request("POST", "/api/events", payload)

    def enforce_tool_call(
        self,
        *,
        tool_name: str,
        arguments: dict[str, Any],
        platform: str = "SDK",
    ) -> dict[str, Any]:
        return self._request(
            "POST",
            "/api/mcp/enforce-tool-call",
            {
                "toolName": tool_name,
                "arguments": arguments,
                "platform": platform,
                "clientSurface": self.client_surface,
            },
        )

    def simulate_policy(
        self,
        *,
        prompt: str,
        platform: str | None = None,
        source_host: str | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {"prompt": prompt}
        if platform:
            payload["platform"] = platform
        if source_host:
            payload["sourceHost"] = source_host
        return self._request("POST", "/api/policy/simulate", payload)
