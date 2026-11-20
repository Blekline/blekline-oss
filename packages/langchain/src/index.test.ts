import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { withBleklineToolGuard } from "./index.js";

describe("@blekline/langchain withBleklineToolGuard", () => {
  it("rejects blocked tool calls", async () => {
    const client = {
      enforceToolCall: async () => ({
        action: "block" as const,
        maskedArguments: {},
        entitiesMasked: 1,
        riskTier: "high" as const,
      }),
    };
    const wrapped = withBleklineToolGuard(client as never, "test_tool", () => "ok");
    await assert.rejects(() => wrapped({}));
  });
});