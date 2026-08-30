import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runCodexAdapter } from "../lib/adapter.mjs";

const baseConfig = {
  apiUrl: "https://app.blekline.com",
  workspaceToken: "blw_test_token",
  platform: "codex",
  promptPolicy: "auto_mask",
  failClosed: false,
  readGuard: true,
  shellGuard: true,
  toolGuard: true,
  mcpGuard: true,
  shellGuardMode: "local",
  mcpGuardMode: "local",
  promptGuardMode: "local_first",
  promptMaskSource: "local",
  enterprisePreset: false,
  copyMaskedToClipboard: false,
  emitAuditEvents: false,
  showMaskedInUi: false,
  maskTimeoutMs: 5000,
};

describe("runCodexAdapter", () => {
  it("allows empty UserPromptSubmit", async () => {
    const out = await runCodexAdapter({ hook_event_name: "UserPromptSubmit", prompt: "   " }, baseConfig);
    assert.equal(out.decision, undefined);
  });

  it("blocks UserPromptSubmit with AWS example key", async () => {
    const out = await runCodexAdapter(
      { hook_event_name: "UserPromptSubmit", prompt: "key AKIAIOSFODNN7EXAMPLE" },
      { ...baseConfig, workspaceToken: "" }
    );
    assert.equal(out.decision, "block");
    assert.match(String(out.reason), /secret/i);
  });

  it("denies PreToolUse Bash cat .env", async () => {
    const out = await runCodexAdapter(
      {
        hook_event_name: "PreToolUse",
        tool_name: "Bash",
        tool_input: { command: "cat .env" },
      },
      baseConfig
    );
    assert.equal(out.decision, "block");
    assert.equal(out.hookSpecificOutput?.permissionDecision, "deny");
  });

  it("SessionStart includes ingress Responses notice", async () => {
    const out = await runCodexAdapter({ hook_event_name: "SessionStart" }, baseConfig);
    assert.match(String(out.hookSpecificOutput?.additionalContext), /Responses/);
  });
});
