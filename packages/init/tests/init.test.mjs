import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { detectClients } from "../lib/detect.mjs";
import { printExampleSteps, printNextSteps, writePolicyStub } from "../init.mjs";
import { bankingAgentImportHint } from "../lib/policy.mjs";

const tmpRoot = join(dirname(fileURLToPath(import.meta.url)), "..", ".tmp-init-test");

describe("@blekline/init", () => {
  it("detects Cursor and Codex dirs", () => {
    mkdirSync(tmpRoot, { recursive: true });
    const dir = mkdtempSync(join(tmpRoot, "detect-"));
    mkdirSync(join(dir, ".cursor"));
    mkdirSync(join(dir, ".codex"));
    const d = detectClients(dir);
    assert.equal(d.cursor, true);
    assert.equal(d.codex, true);
    rmSync(dir, { recursive: true, force: true });
  });

  it("writes policy stub with placeholder token", () => {
    mkdirSync(tmpRoot, { recursive: true });
    const dir = mkdtempSync(join(tmpRoot, "policy-"));
    const path = writePolicyStub({ workspaceRoot: dir, force: true });
    const json = JSON.parse(readFileSync(path, "utf8"));
    assert.equal(json.workspaceToken, "blw_replace_with_workspace_token");
    assert.equal(json.maskBackend, "local");
    assert.equal(json.surfaces.cursor.silentAutoSend, false);
    assert.equal(json.surfaces.codex.silentAutoSend, "ingress_responses");
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("mentions clipboard and Responses in next steps", () => {
    const text = printNextSteps({ cursor: true, claude: false, codex: true });
    assert.match(text, /clipboard/);
    assert.match(text, /Responses/);
  });

  it("includes platform path for workflows and act runs", () => {
    const text = printNextSteps({ cursor: false, claude: false, codex: false });
    assert.match(text, /Platform path/);
    assert.match(text, /workflows-and-runs/);
    assert.match(text, /runtime-policy/);
    assert.match(text, /examples\/cells\/first-act-run/);
  });

  it("resolves example id from manifest", () => {
    const text = printExampleSteps("mistral");
    assert.match(text, /mistral-governed-chat/);
    assert.match(text, /integrations\/mistral-stack/);
  });

  it("writes banking-agent preset with sidecar backend", () => {
    mkdirSync(tmpRoot, { recursive: true });
    const dir = mkdtempSync(join(tmpRoot, "banking-"));
    const pathWritten = writePolicyStub({
      workspaceRoot: dir,
      force: true,
      preset: "banking-agent",
      entryPath: "fleet",
      maskBackend: "sidecar",
    });
    const json = JSON.parse(readFileSync(pathWritten, "utf8"));
    assert.equal(json.preset, "banking-agent");
    assert.equal(json.policyPackId, "banking-agent-v1");
    assert.equal(json.maskBackend, "sidecar");
    assert.equal(json.entryPath, "fleet");
    rmSync(dir, { recursive: true, force: true });
  });

  it("includes policy pack import hint for banking preset", () => {
    const text = printNextSteps({ cursor: true, claude: false, codex: false }, { preset: "banking-agent" });
    assert.match(text, /banking-agent-v1/);
    assert.match(bankingAgentImportHint(), /policy-pack\/apply/);
  });
});
