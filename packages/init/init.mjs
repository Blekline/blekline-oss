#!/usr/bin/env node
/**
 * Detect Claude/Cursor/Codex, write `.blekline/policy.json`, print next steps.
 * Optionally spawn cursor-hooks / codex-hooks init.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { detectClients } from "./lib/detect.mjs";
import { bankingAgentImportHint, defaultPolicyJson } from "./lib/policy.mjs";
import { maskBackendFromEntryPath, parseMaskBackend } from "../client-hooks/lib/mask-backend.mjs";

const require = createRequire(import.meta.url);

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("-")) {
    return process.argv[i + 1];
  }
  return null;
}

function resolveBin(pkgName, binFile) {
  try {
    const pkgJson = require.resolve(`${pkgName}/package.json`);
    return join(dirname(pkgJson), binFile);
  } catch {
    return null;
  }
}

/**
 * @param {object} opts
 */
export function writePolicyStub(opts) {
  const root = resolve(opts.workspaceRoot);
  const force = opts.force === true;
  const policyPath = join(root, ".blekline", "policy.json");
  mkdirSync(dirname(policyPath), { recursive: true });
  if (!existsSync(policyPath) || force) {
    writeFileSync(
      policyPath,
      `${JSON.stringify(
        defaultPolicyJson({
          entryPath: opts.entryPath,
          maskBackend: opts.maskBackend,
          preset: opts.preset,
        }),
        null,
        2
      )}\n`
    );
    return policyPath;
  }
  return null;
}

export function printNextSteps(detected, opts = {}) {
  const lines = ["Blekline init — next steps", ""];
  lines.push("Platform path (cells):");
  lines.push("  1. Sign up + API key: https://app.blekline.com/auth/signup");
  lines.push("     https://app.blekline.com/docs/api-keys");
  lines.push("  2. Publish runtime policy: https://app.blekline.com/docs/runtime-policy");
  lines.push("  3. First act run: https://app.blekline.com/docs/workflows-and-runs");
  lines.push("     node examples/cells/first-act-run/index.mjs (set BLEKLINE_WORKSPACE_TOKEN, BLEKLINE_WORKFLOW_ID)");
  lines.push("");
  if (opts.preset === "banking-agent") {
    lines.push("Banking-agent preset:");
    lines.push("  Sidecar mask backend + fleet entry path configured in .blekline/policy.json");
    lines.push("");
    lines.push(bankingAgentImportHint());
    lines.push("");
  }
  if (detected.cursor) {
    lines.push("Cursor detected:");
    lines.push("  npx @blekline/cursor-hooks init");
    lines.push("  Native chat is block + clipboard paste — not silent auto-send.");
    lines.push("");
  } else {
    lines.push("Cursor not detected. To add hooks: npx @blekline/cursor-hooks init");
    lines.push("");
  }
  if (detected.claude) {
    lines.push("Claude Code detected:");
    lines.push("  Copy .claude/settings.json.example → .claude/settings.json (or pnpm generate:mcp-configs)");
    lines.push("");
  }
  if (detected.codex) {
    lines.push("Codex detected:");
    lines.push("  npx @blekline/codex-hooks init");
    lines.push("  Silent auto-send: Blekline ingress on the OpenAI Responses API.");
    lines.push("");
  }
  lines.push("Replace workspaceToken blw_replace_with_workspace_token in .blekline/policy.json");
  return lines.join("\n");
}

export function printExampleSteps(exampleId) {
  const manifestPath = join(dirname(fileURLToPath(import.meta.url)), "../../integrations/manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const id = exampleId.startsWith("example-") ? exampleId : `example-${exampleId}`;
  const entry = manifest.entries.find((e) => e.id === id || e.id === exampleId);
  if (!entry?.examplePath) {
    return `Unknown example "${exampleId}". Run from repo root and see integrations/manifest.json (tier: example).`;
  }
  const lines = [`Blekline example — ${entry.id}`, ""];
  lines.push(`Path: ${entry.examplePath}`);
  lines.push(`Docs: https://app.blekline.com/docs/${entry.docSlug}`);
  lines.push("");
  lines.push("Platform path:");
  lines.push("  1. API key: https://app.blekline.com/docs/api-keys");
  lines.push("  2. Publish policy: https://app.blekline.com/docs/runtime-policy");
  lines.push("  3. Act runs: https://app.blekline.com/docs/workflows-and-runs");
  lines.push("");
  lines.push(`Open README: ${entry.examplePath}/README.md`);
  return lines.join("\n");
}

function runOptionalInit(pkgName, binFile, cwd) {
  const bin = resolveBin(pkgName, binFile);
  if (bin) {
    const r = spawnSync(process.execPath, [bin], { cwd, stdio: "inherit" });
    return r.status ?? 1;
  }
  const r = spawnSync("npx", ["-y", pkgName], { cwd, stdio: "inherit" });
  return r.status ?? 1;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const exampleId = argValue("--example");
  if (exampleId) {
    console.log(printExampleSteps(exampleId));
    process.exit(0);
  }
  const root = resolve(argValue("--cwd") ?? process.cwd());
  const detected = detectClients(root);
  const presetArg = argValue("--preset");
  const preset = presetArg === "banking-agent" ? "banking-agent" : undefined;
  const entryPath =
    preset === "banking-agent" ? argValue("--path") ?? "fleet" : argValue("--path") ?? undefined;
  const maskBackend =
    preset === "banking-agent"
      ? parseMaskBackend(argValue("--mask-backend")) ?? "sidecar"
      : parseMaskBackend(argValue("--mask-backend")) ?? undefined;
  const written = writePolicyStub({
    workspaceRoot: root,
    force: process.argv.includes("--force"),
    entryPath,
    maskBackend,
    preset,
  });
  if (written) console.log(`Wrote ${written}`);
  console.log(printNextSteps(detected, { preset }));

  if (process.argv.includes("--cursor-hooks")) {
    const code = runOptionalInit("@blekline/cursor-hooks", "init.mjs", root);
    if (code !== 0) process.exit(code);
  }
  if (process.argv.includes("--codex-hooks")) {
    const code = runOptionalInit("@blekline/codex-hooks", "init.mjs", root);
    if (code !== 0) process.exit(code);
  }
}
