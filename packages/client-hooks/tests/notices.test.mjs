import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  NOTICE_CODEX_INGRESS_AUTO_SEND,
  NOTICE_CURSOR_NO_SILENT_AUTO_SEND,
  buildBlockUserMessage,
  maskPromptLocally,
} from "../index.mjs";

describe("maskPromptLocally", () => {
  it("masks AWS example keys", () => {
    const { maskedText, entitiesMasked } = maskPromptLocally("key AKIAIOSFODNN7EXAMPLE");
    assert.ok(entitiesMasked >= 1);
    assert.doesNotMatch(maskedText, /AKIAIOSFODNN7EXAMPLE/);
  });
});

describe("notices", () => {
  it("states Cursor is block+clipboard not silent auto-send", () => {
    assert.match(NOTICE_CURSOR_NO_SILENT_AUTO_SEND, /block \+ clipboard/i);
    assert.match(NOTICE_CURSOR_NO_SILENT_AUTO_SEND, /not silent auto-send/i);
  });

  it("points Codex silent auto-send at ingress Responses", () => {
    assert.match(NOTICE_CODEX_INGRESS_AUTO_SEND, /ingress/i);
    assert.match(NOTICE_CODEX_INGRESS_AUTO_SEND, /Responses/i);
  });

  it("buildBlockUserMessage omits masked body by default", () => {
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
