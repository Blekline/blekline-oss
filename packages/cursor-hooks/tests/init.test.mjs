import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeCursorHookFiles } from "../init.mjs";

const tmpRoot = join(dirname(fileURLToPath(import.meta.url)), "..", ".tmp-init-test");

describe("cursor-hooks init", () => {
  it("writes sh, cmd, hooks.json, and cursor.json", () => {
    mkdirSync(tmpRoot, { recursive: true });
    const dir = mkdtempSync(join(tmpRoot, "run-"));
    writeCursorHookFiles({ workspaceRoot: dir, quiet: true, force: true });
    const hooksJson = JSON.parse(readFileSync(join(dir, ".cursor", "hooks.json"), "utf8"));
    assert.equal(hooksJson.hooks.beforeSubmitPrompt[0].command, ".cursor/hooks/blekline-mask-prompt.sh");
    assert.ok(!String(hooksJson.hooks.beforeSubmitPrompt[0].command).includes("node"));
    assert.ok(existsSync(join(dir, ".cursor", "hooks", "blekline-mask-prompt.sh")));
    assert.ok(existsSync(join(dir, ".cursor", "hooks", "blekline-mask-prompt.cmd")));
    const cfg = JSON.parse(readFileSync(join(dir, ".blekline", "cursor.json"), "utf8"));
    assert.equal(cfg.workspaceToken, "blw_replace_with_workspace_token");
    rmSync(tmpRoot, { recursive: true, force: true });
  });
});
