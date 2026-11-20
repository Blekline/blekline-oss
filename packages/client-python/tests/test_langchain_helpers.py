import pytest

from blekline_client.langchain import with_tool_guard


def test_with_tool_guard_blocks():
    class FakeClient:
        def enforce_tool_call(self, **kwargs):
            return {"action": "block", "maskedArguments": {}}

    wrapped = with_tool_guard(FakeClient(), "t", lambda args: args)
    with pytest.raises(RuntimeError, match="blocked"):
        wrapped({})