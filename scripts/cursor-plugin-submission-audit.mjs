#!/usr/bin/env node
/**
 * Marketplace submission audit for plugins/cursor — exit 0 when ready to submit.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN = join(ROOT, "plugins", "cursor");
const failures = [];

function fail(msg) {
  failures.push(msg);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    fail(`invalid JSON: ${path} (${e.message})`);
    return null;
  }
}

function checkManifest() {
  const manifestPath = join(PLUGIN, ".cursor-plugin", "plugin.json");
  if (!existsSync(manifestPath)) fail("missing .cursor-plugin/plugin.json");
  const manifest = readJson(manifestPath);
  if (!manifest) return;
  if (manifest.name !== "blekline") fail("manifest.name must be blekline");
  if (manifest.displayName !== "Blekline") fail("manifest.displayName must be Blekline");
  if (!manifest.logo || !existsSync(join(PLUGIN, manifest.logo))) {
    fail(`manifest.logo missing or file not found: ${manifest.logo}`);
  }
  if (!manifest.variables?.properties?.BLEKLINE_WORKSPACE_TOKEN) {
    fail("manifest.variables must declare BLEKLINE_WORKSPACE_TOKEN");
  }
  for (const key of ["skills", "commands", "rules", "hooks", "mcpServers"]) {
    const val = manifest[key];
    if (typeof val === "string" && val.includes("..")) fail(`${key} must not use parent paths`);
  }
}

function checkMcp() {
  const mcp = readJson(join(PLUGIN, "mcp.json"));
  if (!mcp) return;
  const blekline = mcp.mcpServers?.blekline;
  if (blekline?.command !== "node") fail("mcp.json blekline.command must be node");
  const arg = blekline?.args?.[0] ?? "";
  if (arg.includes("${workspaceFolder}")) fail("mcp.json must not use ${workspaceFolder} in plugin MCP args");
  if (!arg.includes(".cursor/blekline/run-mcp-server.mjs")) {
    fail("mcp.json must use .cursor/blekline/run-mcp-server.mjs");
  }
  if (blekline?.envFile !== ".blekline/mcp.env") fail("mcp.json envFile must be .blekline/mcp.env");
  if (blekline?.env?.BLEKLINE_WORKSPACE_TOKEN !== "${BLEKLINE_WORKSPACE_TOKEN}") {
    fail("mcp.json must use ${BLEKLINE_WORKSPACE_TOKEN} plugin variable");
  }
}

function checkSkills() {
  const skillsDir = join(PLUGIN, "skills");
  const skills = readdirSync(skillsDir, { withFileTypes: true }).filter((e) => e.isDirectory());
  if (skills.length > 4) fail(`skills count ${skills.length} exceeds 4`);
  for (const s of skills) {
    const md = join(skillsDir, s.name, "SKILL.md");
    if (!existsSync(md)) fail(`missing ${s.name}/SKILL.md`);
    const text = readFileSync(md, "utf8");
    if (!/^---\nname:\s/m.test(text)) fail(`${s.name}/SKILL.md missing name frontmatter`);
    if (!/^---[\s\S]*?description:\s/m.test(text)) fail(`${s.name}/SKILL.md missing description frontmatter`);
  }
}

function checkCommands() {
  const commandsDir = join(PLUGIN, "commands");
  const commands = readdirSync(commandsDir).filter((f) => f.endsWith(".md"));
  if (commands.length > 3) fail(`commands count ${commands.length} exceeds 3`);
  for (const c of commands) {
    const text = readFileSync(join(commandsDir, c), "utf8");
    if (!/^---\nname:\s/m.test(text)) fail(`commands/${c} missing name frontmatter`);
  }
}

function checkHooks() {
  const hooksJson = readJson(join(PLUGIN, "hooks", "hooks.json"));
  if (!hooksJson) return;
  for (const entries of Object.values(hooksJson.hooks ?? {})) {
    for (const entry of entries) {
      const cmd = entry.command ?? "";
      if (cmd.includes("node ") || cmd.endsWith(".mjs")) fail("hooks must use shell wrappers, not bare node");
      if (!cmd.endsWith(".sh")) fail(`hook command must end with .sh: ${cmd}`);
      const base = cmd.replace(/^\.\/hooks\//, "").replace(/\.sh$/, "");
      if (!existsSync(join(PLUGIN, "hooks", `${base}.cmd`))) fail(`missing Windows wrapper for ${base}`);
    }
  }
}

function checkReadmeClaims() {
  const readme = readFileSync(join(PLUGIN, "README.md"), "utf8");
  if (!/block.*clipboard|clipboard.*block/i.test(readme)) {
    fail("README must state block + clipboard behavior");
  }
  if (/silent auto-send/i.test(readme) && !/not silent auto-send|is not silent/i.test(readme)) {
    fail("README must not claim silent auto-send without negation");
  }
  if (/\bblw_[a-z0-9]{20,}\b/i.test(readme)) fail("README must not contain real-looking workspace tokens");
}

function checkNoStalePaths() {
  if (existsSync(join(PLUGIN, "scripts", "run-mcp-server.mjs"))) {
    fail("remove plugins/cursor/scripts/ — launchers ship via @blekline/cursor-hooks init into .cursor/blekline/");
  }
}

function checkChatGuardRule() {
  const example = join(ROOT, ".cursor/rules/blekline-chat-guard.mdc.example");
  const plugin = join(PLUGIN, "rules/blekline-chat-guard.mdc");
  if (!existsSync(example)) {
    fail("missing .cursor/rules/blekline-chat-guard.mdc.example");
    return;
  }
  const exampleText = readFileSync(example, "utf8");
  if (!/block \+ clipboard|clipboard.*block/i.test(exampleText)) {
    fail("blekline-chat-guard.mdc.example must document block + clipboard behavior");
  }
  if (existsSync(plugin)) {
    const stripFrontmatter = (t) => t.replace(/^---[\s\S]*?---\n/, "");
    if (stripFrontmatter(exampleText) !== stripFrontmatter(readFileSync(plugin, "utf8"))) {
      fail("blekline-chat-guard.mdc.example body must match plugins/cursor/rules/blekline-chat-guard.mdc");
    }
  }
}

function main() {
  checkManifest();
  checkMcp();
  checkSkills();
  checkCommands();
  checkHooks();
  checkReadmeClaims();
  checkNoStalePaths();
  checkChatGuardRule();
  if (failures.length) {
    console.error("cursor-plugin-submission-audit FAILED:");
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("cursor-plugin-submission-audit OK");
}

main();
