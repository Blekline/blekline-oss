#!/usr/bin/env node
/**
 * Write `.cursor/hooks.json` shell/.cmd wrappers, copy hook wrappers, and
 * `.blekline/cursor.json` (placeholder token only).
 *
 *   npx @blekline/cursor-hooks init
 *   node packages/cursor-hooks/init.mjs --force
 *   node packages/cursor-hooks/init.mjs --hooks-dir plugins/cursor/hooks --hooks-json plugins/cursor/hooks/hooks.json --skip-cursor-json --command-prefix ./hooks/
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyMaskBackendToCursorJson,
  parseMaskBackend,
} from "../../client-hooks/lib/mask-backend.mjs";
import { buildCursorHooksJson, CURSOR_HOOKS, defaultCursorJson } from "./lib/hook-catalog.mjs";
import { renderPosixWrapper, renderWindowsWrapper } from "./lib/hook-wrappers.mjs";

const FORCE = process.argv.includes("--force");
const SKIP_CURSOR_JSON = process.argv.includes("--skip-cursor-json");
const WINDOWS_JSON = process.argv.includes("--windows-json");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("-")) {
    return process.argv[i + 1];
  }
  return null;
}

function cwdRoot() {
  return resolve(argValue("--cwd") ?? process.cwd());
}

function loadPolicyMaskBackend(workspaceRoot) {
  const policyPath = join(workspaceRoot, ".blekline", "policy.json");
  if (!existsSync(policyPath)) return null;
  try {
    const policy = JSON.parse(readFileSync(policyPath, "utf8"));
    return parseMaskBackend(policy?.maskBackend);
  } catch {
    return null;
  }
}

/**
 * @param {object} opts
 * @param {string} opts.workspaceRoot
 * @param {string} [opts.hooksDir]
 * @param {string} [opts.hooksJsonPath]
 * @param {string} [opts.cursorJsonPath]
 * @param {string} [opts.commandPrefix]
 * @param {boolean} [opts.skipCursorJson]
 * @param {boolean} [opts.force]
 * @param {boolean} [opts.windowsJson]
 * @param {boolean} [opts.quiet]
 */
export function writeCursorHookFiles(opts) {
  const workspaceRoot = resolve(opts.workspaceRoot);
  const hooksDir = resolve(opts.hooksDir ?? join(workspaceRoot, ".cursor", "hooks"));
  const hooksJsonPath = resolve(opts.hooksJsonPath ?? join(workspaceRoot, ".cursor", "hooks.json"));
  const cursorJsonPath = resolve(opts.cursorJsonPath ?? join(workspaceRoot, ".blekline", "cursor.json"));
  const commandPrefix = opts.commandPrefix ?? ".cursor/hooks/";
  const force = opts.force === true;
  const written = [];

  mkdirSync(hooksDir, { recursive: true });
  for (const hook of CURSOR_HOOKS) {
    const shPath = join(hooksDir, `${hook.wrapper}.sh`);
    const cmdPath = join(hooksDir, `${hook.wrapper}.cmd`);
    writeFileSync(shPath, renderPosixWrapper(hook));
    writeFileSync(cmdPath, renderWindowsWrapper(hook));
    try {
      chmodSync(shPath, 0o755);
    } catch {
      /* ignore on platforms without chmod */
    }
    written.push(shPath, cmdPath);
  }

  const hooksJson = buildCursorHooksJson(commandPrefix, { windows: opts.windowsJson === true });
  mkdirSync(dirname(hooksJsonPath), { recursive: true });
  writeFileSync(hooksJsonPath, `${JSON.stringify(hooksJson, null, 2)}\n`);
  written.push(hooksJsonPath);

  if (!opts.skipCursorJson) {
    mkdirSync(dirname(cursorJsonPath), { recursive: true });
    if (!existsSync(cursorJsonPath) || force) {
      const backend = loadPolicyMaskBackend(workspaceRoot);
      const base = defaultCursorJson();
      const payload = backend ? applyMaskBackendToCursorJson(base, backend) : base;
      writeFileSync(cursorJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
      written.push(cursorJsonPath);
    }
  }

  if (!opts.quiet) {
    console.log("Wrote Blekline Cursor hooks:");
    for (const p of written) console.log(`  ${p}`);
    console.log("Replace workspaceToken blw_replace_with_workspace_token in .blekline/cursor.json");
    console.log("Native Cursor chat is block+clipboard paste — not silent auto-send.");
  }
  return written;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const root = cwdRoot();
  writeCursorHookFiles({
    workspaceRoot: root,
    hooksDir: argValue("--hooks-dir") ? resolve(root, argValue("--hooks-dir")) : undefined,
    hooksJsonPath: argValue("--hooks-json") ? resolve(root, argValue("--hooks-json")) : undefined,
    cursorJsonPath: argValue("--cursor-json") ? resolve(root, argValue("--cursor-json")) : undefined,
    commandPrefix: argValue("--command-prefix") ?? undefined,
    skipCursorJson: SKIP_CURSOR_JSON,
    force: FORCE,
    windowsJson: WINDOWS_JSON,
  });
}
