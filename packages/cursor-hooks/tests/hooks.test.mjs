import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scanPromptAttachments } from "../lib/attachment-guard.mjs";
import { runAfterShellExecutionHook } from "../lib/after-shell-hook.mjs";
import { runBeforeMcpExecutionHook } from "../lib/mcp-guard.mjs";
import {
  buildBlockUserMessage,
  findHardSecrets,
  runMaskPromptHook,
} from "../lib/mask-prompt-hook.mjs";
import { runBeforeReadFileHook } from "../lib/before-read-file-hook.mjs";
import { runBeforeShellExecutionHook } from "../lib/shell-guard.mjs";
import { runPreToolUseHook } from "../lib/tool-guard.mjs";
import { runSessionStartHook } from "../lib/session-start-hook.mjs";
import { continueOnHookError, permissionOnHookError } from "../lib/hook-io.mjs";
import {
  clearPendingMaskedPrompt,
  writePendingMaskedPrompt,
} from "../lib/pending-mask.mjs";
import { findWorkspaceRoot } from "../lib/config.mjs";
import { mkdtempSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const baseConfig = {
  apiUrl: "https://app.blekline.com",
  workspaceToken: "blw_test_token",
  platform: "cursor",
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

describe("findHardSecrets", () => {
  it("detects AWS keys", () => {
    const findings = findHardSecrets("key AKIAIOSFODNN7EXAMPLE");
    assert.ok(findings.some((f) => f.id === "aws_access_key"));
  });

  it("ignores plain email for hard-secret filter", () => {
    const findings = findHardSecrets("alice@corp.com");
    assert.equal(findings.length, 0);
  });
});

describe("buildBlockUserMessage", () => {
  it("does not include masked body by default", () => {
    const msg = buildBlockUserMessage({
      entitiesMasked: 2,
      requestId: "abc-123-def",
      copied: true,
      showMaskedInUi: false,
      maskedText: "Contact [EMAIL_001]",
    });
    assert.match(msg, /2 entities/);
    assert.match(msg, /clipboard/);
    assert.doesNotMatch(msg, /\[EMAIL_001\]/);
  });
});

describe("runMaskPromptHook", () => {
  it("allows empty prompts", async () => {
    const out = await runMaskPromptHook({ prompt: "   " }, baseConfig);
    assert.equal(out.continue, true);
  });

  it("blocks hard secrets in agent mode", async () => {
    const out = await runMaskPromptHook(
      { prompt: "AWS AKIAIOSFODNN7EXAMPLE" },
      { ...baseConfig, promptPolicy: "agent" }
    );
    assert.equal(out.continue, false);
  });

  it("blocks sensitive attachments", async () => {
    const out = await runMaskPromptHook(
      {
        prompt: "review this file",
        attachments: [{ type: "file", file_path: "/project/.env" }],
      },
      baseConfig
    );
    assert.equal(out.continue, false);
    assert.match(out.user_message ?? "", /attachment/i);
  });

  it("allows clean prompts without cloud call when local_first", async () => {
    let fetchCalled = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      fetchCalled = true;
      throw new Error("should not call cloud for clean prompt");
    };

    try {
      const out = await runMaskPromptHook(
        { prompt: "refactor the auth module please" },
        { ...baseConfig, promptGuardMode: "local_first" }
      );
      assert.equal(out.continue, true);
      assert.equal(fetchCalled, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("masks sensitive prompts locally without cloud", async () => {
    let fetchCalled = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      fetchCalled = true;
      throw new Error("cloud should not be called");
    };

    try {
      const out = await runMaskPromptHook(
        { prompt: "Contact alice@corp.com AWS AKIAIOSFODNN7EXAMPLE", conversation_id: "local-mask-1" },
        { ...baseConfig, promptMaskSource: "local", copyMaskedToClipboard: false }
      );
      assert.equal(out.continue, false);
      assert.equal(fetchCalled, false);
      assert.match(out.user_message ?? "", /entit/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("blocks with concise message when cloud masks entities", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      /** @type {Response} */ ({
        ok: true,
        json: async () => ({
          maskedText: "Contact [EMAIL_001]",
          entitiesMasked: 1,
          provider: "azure",
          requestId: "req-123",
        }),
      });

    try {
      const out = await runMaskPromptHook(
        { prompt: "Contact alice@corp.com", conversation_id: "conv-test-1" },
        { ...baseConfig, copyMaskedToClipboard: false, promptMaskSource: "cloud" }
      );
      assert.equal(out.continue, false);
      assert.match(out.user_message ?? "", /1 entit/);
      assert.doesNotMatch(out.user_message ?? "", /\[EMAIL_001\]/);
      assert.equal(out.prompt, undefined);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("allows resubmit of pending masked prompt", async () => {
    const root = mkdtempSync(join(process.cwd(), ".tmp-hook-test-"));
    const prevCwd = process.cwd();
    process.chdir(root);
    try {
      mkdirSync(join(root, ".cursor"), { recursive: true });
      writePendingMaskedPrompt(root, "conv-resubmit", {
        maskedText: "Contact [EMAIL_001]",
        entitiesMasked: 1,
        requestId: "req-abc",
      });

      const out = await runMaskPromptHook(
        { prompt: "Contact [EMAIL_001]", conversation_id: "conv-resubmit" },
        baseConfig
      );
      assert.equal(out.continue, true);
    } finally {
      process.chdir(prevCwd);
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("falls back to local mask when cloud fails", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      /** @type {Response} */ ({
        ok: false,
        status: 503,
        json: async () => ({ error: "timeout", code: "timeout" }),
      });

    try {
      const out = await runMaskPromptHook(
        { prompt: "Contact alice@corp.com" },
        { ...baseConfig, promptMaskSource: "cloud", copyMaskedToClipboard: false }
      );
      assert.equal(out.continue, false);
      assert.match(out.user_message ?? "", /entit/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("scanPromptAttachments", () => {
  it("flags .env attachment paths", () => {
    const scan = scanPromptAttachments([{ type: "file", file_path: "src/../.env" }]);
    assert.equal(scan.blocked, true);
    assert.equal(scan.paths.length, 1);
  });
});

describe("runBeforeShellExecutionHook", () => {
  it("denies cat .env", () => {
    const out = runBeforeShellExecutionHook({ command: "cat .env" }, baseConfig);
    assert.equal(out.permission, "deny");
  });

  it("allows benign commands", () => {
    const out = runBeforeShellExecutionHook({ command: "pnpm test" }, baseConfig);
    assert.equal(out.permission, "allow");
  });

  it("denies commands with hard secrets", () => {
    const out = runBeforeShellExecutionHook(
      { command: "curl -H 'Authorization: Bearer sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz'" },
      baseConfig
    );
    assert.equal(out.permission, "deny");
  });
});

describe("runPreToolUseHook", () => {
  it("denies Read on .env", () => {
    const out = runPreToolUseHook(
      { tool_name: "Read", tool_input: { file_path: "/app/.env" } },
      baseConfig
    );
    assert.equal(out.permission, "deny");
  });

  it("redacts Write content via updated_input", () => {
    const out = runPreToolUseHook(
      {
        tool_name: "Write",
        tool_input: { content: "key=AKIAIOSFODNN7EXAMPLE" },
      },
      baseConfig
    );
    assert.equal(out.permission, "allow");
    assert.ok(out.updated_input);
    assert.doesNotMatch(String(out.updated_input.content), /AKIAIOSFODNN7EXAMPLE/);
  });
});

describe("runBeforeMcpExecutionHook", () => {
  it("allows blekline-proxy server", async () => {
    const out = await runBeforeMcpExecutionHook(
      {
        tool_name: "write_file",
        tool_input: { path: "x.txt", content: "hello" },
        command: "node packages/mcp-proxy/dist/index.js",
      },
      baseConfig
    );
    assert.equal(out.permission, "allow");
  });

  it("does not bypass governance via substring blekline-proxy in unrelated command", async () => {
    const out = await runBeforeMcpExecutionHook(
      {
        tool_name: "write_file",
        tool_input: { content: "AWS AKIAIOSFODNN7EXAMPLE" },
        command: "node ./vendor/not-blekline-proxy/dist/index.js",
      },
      { ...baseConfig, mcpGuardMode: "local" }
    );
    assert.equal(out.permission, "deny");
  });

  it("denies MCP calls with secrets", async () => {
    const out = await runBeforeMcpExecutionHook(
      {
        tool_name: "write_file",
        tool_input: { content: "AWS AKIAIOSFODNN7EXAMPLE" },
        command: "npx some-mcp-server",
      },
      { ...baseConfig, mcpGuardMode: "local" }
    );
    assert.equal(out.permission, "deny");
  });
});

describe("runAfterShellExecutionHook", () => {
  it("returns empty object when no secrets in output", () => {
    const out = runAfterShellExecutionHook({ command: "echo hi", output: "hi" }, baseConfig);
    assert.deepEqual(out, {});
  });
});

describe("hook-io failClosed", () => {
  it("denies permission when failClosed", () => {
    const out = permissionOnHookError({ ...baseConfig, failClosed: true });
    assert.equal(out.permission, "deny");
  });

  it("blocks continue when failClosed", () => {
    const out = continueOnHookError({ ...baseConfig, failClosed: true });
    assert.equal(out.continue, false);
  });
});

describe("runBeforeReadFileHook", () => {
  it("denies .env reads", () => {
    const out = runBeforeReadFileHook({ file_path: "/project/.env" }, baseConfig);
    assert.equal(out.permission, "deny");
  });

  it("allows normal source files", () => {
    const out = runBeforeReadFileHook({ file_path: "/project/src/index.ts" }, baseConfig);
    assert.equal(out.permission, "allow");
  });
});

describe("runSessionStartHook", () => {
  it("injects env and context when configured", () => {
    const out = runSessionStartHook({}, baseConfig);
    assert.equal(out.env?.BLEKLINE_WORKSPACE_TOKEN, "blw_test_token");
    assert.match(out.additional_context ?? "", /Blekline chat guard/);
  });
});

describe("findWorkspaceRoot", () => {
  it("finds repo from packages path", () => {
    const root = findWorkspaceRoot(join(process.cwd(), "packages", "cursor-hooks"));
    assert.ok(existsSync(join(root, "integrations", "manifest.json")));
  });
});
