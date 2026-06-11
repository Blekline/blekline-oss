"""Unit tests for blekline_client — no live API calls."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import httpx
import pytest

from blekline_client import BleklineApiError, BleklineClient


def _mock_httpx_client(response: httpx.Response) -> MagicMock:
    mock_client = MagicMock()
    mock_client.request.return_value = response
    mock_client.__enter__ = MagicMock(return_value=mock_client)
    mock_client.__exit__ = MagicMock(return_value=False)
    return mock_client


@patch("blekline_client.httpx.Client")
def test_mask_success(mock_client_cls: MagicMock) -> None:
    mock_client_cls.return_value = _mock_httpx_client(
        httpx.Response(200, json={"maskedText": "Contact [EMAIL]"})
    )
    client = BleklineClient(workspace_token="blw_test", client_surface="sdk")
    result = client.mask(text="Contact jane@acme.com", platform="pytest")
    assert result["maskedText"] == "Contact [EMAIL]"
    req = mock_client_cls.return_value.request
    req.assert_called_once()
    assert req.call_args[0][0] == "POST"
    assert req.call_args[0][1] == "/api/mask"


@patch("blekline_client.httpx.Client")
def test_headers_include_client_surface(mock_client_cls: MagicMock) -> None:
    mock_client_cls.return_value = _mock_httpx_client(httpx.Response(200, json={}))
    client = BleklineClient(
        workspace_token="blw_test",
        workspace_id="ws_abc",
        client_surface="claude-code",
    )
    client.mask(text="x", platform="pytest")
    headers = mock_client_cls.return_value.request.call_args[1]["headers"]
    assert headers["x-blekline-workspace-token"] == "blw_test"
    assert headers["x-blekline-client-surface"] == "claude-code"
    assert headers["x-blekline-workspace-id"] == "ws_abc"


@patch("blekline_client.httpx.Client")
def test_enforce_tool_call_payload(mock_client_cls: MagicMock) -> None:
    mock_client_cls.return_value = _mock_httpx_client(
        httpx.Response(200, json={"action": "allow"})
    )
    client = BleklineClient(workspace_token="blw_test", client_surface="sdk")
    result = client.enforce_tool_call(
        tool_name="run_shell",
        arguments={"cmd": "echo hi"},
        platform="pytest",
    )
    assert result["action"] == "allow"
    body = mock_client_cls.return_value.request.call_args[1]["json"]
    assert body["toolName"] == "run_shell"
    assert body["clientSurface"] == "sdk"


@patch("blekline_client.httpx.Client")
def test_api_error_on_401(mock_client_cls: MagicMock) -> None:
    mock_client_cls.return_value = _mock_httpx_client(
        httpx.Response(401, text="unauthorized")
    )
    client = BleklineClient(workspace_token="blw_bad")
    with pytest.raises(BleklineApiError) as exc:
        client.mask(text="x")
    assert exc.value.status == 401


@patch("blekline_client.httpx.Client")
def test_base_url_strips_trailing_slash(mock_client_cls: MagicMock) -> None:
    mock_client_cls.return_value = _mock_httpx_client(httpx.Response(200, json={}))
    client = BleklineClient(
        workspace_token="blw_test",
        base_url="https://app.blekline.com/",
    )
    client.emit_event(kind="test", platform="pytest")
    assert mock_client_cls.call_args[1]["base_url"] == "https://app.blekline.com"
