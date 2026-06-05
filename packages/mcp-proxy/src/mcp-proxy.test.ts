import test from "node:test";
import assert from "node:assert/strict";
import { enforceToolCallLocally } from "@blekline/contracts";

test("blocks destructive shell patterns", () => {
  const result = enforceToolCallLocally({
    toolName: "run_shell",
    arguments: { command: "rm -rf /" },
    requestId: "test-1",
  });
  assert.equal(result.action, "block");
});

test("masks AWS key in tool arguments", () => {
  const result = enforceToolCallLocally({
    toolName: "run_shell",
    arguments: { command: "export AWS_KEY=AKIAIOSFODNN7EXAMPLE" },
    requestId: "test-2",
  });
  assert.equal(result.action, "mask");
  assert.ok(result.entitiesMasked > 0);
  assert.ok(JSON.stringify(result.maskedArguments).includes("[AWS_KEY]"));
});
