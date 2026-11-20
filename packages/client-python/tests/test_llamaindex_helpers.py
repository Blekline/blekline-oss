import pytest

from blekline_client.llamaindex import guard_tool_call


def test_guard_tool_call_blocks():
    class FakeClient:
        def enforce_tool_call(self, **kwargs):
            return {"action": "block", "maskedArguments": {}}

    with pytest.raises(RuntimeError, match="blocked"):
        guard_tool_call(FakeClient(), "t", {})