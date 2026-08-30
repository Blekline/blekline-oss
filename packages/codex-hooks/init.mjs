#!/usr/bin/env node
/**
 * Write `.codex/hooks.json` and POSIX/.cmd wrappers.
 *
 *   npx @blekline/codex-hooks init
 */
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCodexHooksJson, CODEX_HOOKS, renderPosixAdapterWrapper, renderWindowsAdapterWrapper } from "./lib/wrappers.mjs";

const FORCE = process.argv.includes("--force");
const SKIP_CODEX_JSON = process.argv.includes("--skip-codex-json");
const WINDOWS_JSON = process.argv.includes("--windows-json");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("-")) {
    return process.argv[i + 1];
  }
  return null;
}

export function defaultCodexJson() {
  return {
    apiUrl: "https://app.blekline.com",
    workspaceToken: "blw_replace_with_workspace_token",
    platform: "codex",
    promptPolicy: "auto_mask",
    promptGuardMode: "local_first",
    promptMaskSource: "local",
    failClosed: false,
    copyMaskedToClipboard: false,
    emitAuditEvents: true,
    maskTimeoutMs: 3500,
  };
}

/**
 * @param {object} opts
 */
export function writeCodexHookFiles(opts) {
  const workspaceRoot = resolve(opts.workspaceRoot);
  const hooksDir = resolve(opts.hooksDir ?? join(workspaceRoot, ".codex", "hooks"));
  const hooksJsonPath = resolve(opts.hooksJsonPath ?? join(workspaceRoot, ".codex", "hooks.json"));
  const codexJsonPath = resolve(opts.codexJsonPath ?? join(workspaceRoot, ".blekline", "codex.json"));
  const commandPrefix = opts.commandPrefix ?? ".codex/hooks/";
  const written = [];

  mkdirSync(hooksDir, { recursive: true });
  for (const hook of CODEX_HOOKS) {
    const shPath = join(hooksDir, `${hook.wrapper}.sh`);
    const cmdPath = join(hooksDir, `${hook.wrapper}.cmd`);
    writeFileSync(shPath, renderPosixAdapterWrapper(hook));
    writeFileSync(cmdPath, renderWindowsAdapterWrapper(hook));
    try {
      chmodSync(shPath, 0o755);
    } catch {
      /* ignore */
    }
    written.push(shPath, cmdPath);
  }

  mkdirSync(dirname(hooksJsonPath), { recursive: true });
  writeFileSync(
    hooksJsonPath,
    `${JSON.stringify(buildCodexHooksJson(commandPrefix, { windows: opts.windowsJson === true, plugin: opts.plugin === true }), null, 2)}\n`
  );
  written.push(hooksJsonPath);

  if (!opts.skipCodexJson) {
    mkdirSync(dirname(codexJsonPath), { recursive: true });
    if (!existsSync(codexJsonPath) || opts.force) {
      writeFileSync(codexJsonPath, `${JSON.stringify(defaultCodexJson(), null, 2)}\n`);
      written.push(codexJsonPath);
    }
  }

  if (!opts.quiet) {
    console.log("Wrote Blekline Codex hooks:");
    for (const p of written) console.log(`  ${p}`);
    console.log("Silent auto-send requires Blekline ingress on the OpenAI Responses API.");
  }
  return written;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const root = resolve(argValue("--cwd") ?? process.cwd());
  writeCodexHookFiles({
    workspaceRoot: root,
    hooksDir: argValue("--hooks-dir") ? resolve(root, argValue("--hooks-dir")) : undefined,
    hooksJsonPath: argValue("--hooks-json") ? resolve(root, argValue("--hooks-json")) : undefined,
    commandPrefix: argValue("--command-prefix") ?? undefined,
    skipCodexJson: SKIP_CODEX_JSON,
    force: FORCE,
    windowsJson: WINDOWS_JSON,
    plugin: process.argv.includes("--plugin"),
  });
}
