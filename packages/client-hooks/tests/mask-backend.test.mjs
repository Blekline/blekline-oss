import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyMaskBackendToCursorJson,
  cursorHookFieldsForMaskBackend,
  maskBackendFromEntryPath,
  parseMaskBackend,
} from "../lib/mask-backend.mjs";

describe("mask-backend", () => {
  it("parses canonical backends", () => {
    assert.equal(parseMaskBackend("local"), "local");
    assert.equal(parseMaskBackend("hosted"), "hosted");
    assert.equal(parseMaskBackend("sidecar"), "sidecar");
    assert.equal(parseMaskBackend("cloud"), null);
  });

  it("maps entry paths to backends", () => {
    assert.equal(maskBackendFromEntryPath("local"), "local");
    assert.equal(maskBackendFromEntryPath("hosted"), "hosted");
    assert.equal(maskBackendFromEntryPath("fleet"), "sidecar");
    assert.equal(maskBackendFromEntryPath("in_vpc"), "sidecar");
  });

  it("hosted uses cloud prompt mask", () => {
    const fields = cursorHookFieldsForMaskBackend("hosted");
    assert.equal(fields.promptMaskSource, "cloud");
    assert.equal(fields.maskBackend, "hosted");
  });

  it("sidecar never uses cloud mask", () => {
    const fields = cursorHookFieldsForMaskBackend("sidecar", {
      sidecarUrl: "http://127.0.0.1:8787",
    });
    assert.equal(fields.promptMaskSource, "local");
    assert.equal(fields.sidecarUrl, "http://127.0.0.1:8787");
  });

  it("applyMaskBackendToCursorJson preserves token", () => {
    const out = applyMaskBackendToCursorJson(
      { workspaceToken: "blw_test", apiUrl: "https://app.blekline.com" },
      "hosted"
    );
    assert.equal(out.workspaceToken, "blw_test");
    assert.equal(out.promptMaskSource, "cloud");
  });
});
