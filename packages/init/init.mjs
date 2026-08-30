#!/usr/bin/env node
/**
 * Detect Claude/Cursor/Codex, write `.blekline/policy.json`, print next steps.
 * Optionally spawn cursor-hooks / codex-hooks init.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { detectClients } from "./lib/detect.mjs";
import { defaultPolicyJson } from "./lib/policy.mjs";
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
        }),
        null,
        2
      )}\n`
    );
    return policyPath;
  }
  return null;
}

export function printNextSteps(detected) {
  const lines = ["Blekline init — next steps", ""];
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
  const root = resolve(argValue("--cwd") ?? process.cwd());
  const detected = detectClients(root);
  const written = writePolicyStub({
    workspaceRoot: root,
    force: process.argv.includes("--force"),
    entryPath: argValue("--path") ?? undefined,
    maskBackend: parseMaskBackend(argValue("--mask-backend")) ?? undefined,
  });
  if (written) console.log(`Wrote ${written}`);
  console.log(printNextSteps(detected));

  if (process.argv.includes("--cursor-hooks")) {
    const code = runOptionalInit("@blekline/cursor-hooks", "init.mjs", root);
    if (code !== 0) process.exit(code);
  }
  if (process.argv.includes("--codex-hooks")) {
    const code = runOptionalInit("@blekline/codex-hooks", "init.mjs", root);
    if (code !== 0) process.exit(code);
  }
}
