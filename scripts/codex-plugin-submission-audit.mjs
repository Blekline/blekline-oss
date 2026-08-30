#!/usr/bin/env node
/**
 * Marketplace submission audit for plugins/codex — exit 0 when ready to submit.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN = join(ROOT, "plugins", "codex");
const PLACEHOLDER = "blw_replace_with_workspace_token";
const LIVE_HEX_TOKEN = /\bblw_[a-f0-9]{24,}\b/i;
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
  const manifestPath = join(PLUGIN, ".codex-plugin", "plugin.json");
  if (!existsSync(manifestPath)) fail("missing .codex-plugin/plugin.json");
  const manifest = readJson(manifestPath);
  if (!manifest) return;
  if (manifest.name !== "blekline") fail("manifest.name must be blekline");
  if (manifest.interface?.displayName !== "Blekline") fail("interface.displayName must be Blekline");
  const logo = manifest.interface?.logo ?? manifest.logo;
  if (!logo || !existsSync(join(PLUGIN, logo.replace(/^\.\//, "")))) {
    fail(`logo missing or file not found: ${logo}`);
  }
  for (const key of ["skills", "commands", "hooks", "mcpServers"]) {
    const val = manifest[key];
    if (typeof val === "string" && val.includes("..")) fail(`${key} must not use parent paths`);
  }
}

function checkMcp() {
  for (const rel of [".mcp.json", ".mcp.json.example"]) {
    const mcp = readJson(join(PLUGIN, rel));
    if (!mcp) continue;
    const blekline = mcp.mcpServers?.blekline;
    const proxy = mcp.mcpServers?.["blekline-proxy"];
    if (blekline?.command !== "npx") fail(`${rel} blekline.command must be npx`);
    if (blekline?.args?.join(" ") !== "-y @blekline/mcp-server") {
      fail(`${rel} blekline must use npx -y @blekline/mcp-server`);
    }
    if (proxy?.command !== "npx") fail(`${rel} blekline-proxy.command must be npx`);
    if (proxy?.args?.join(" ") !== "-y @blekline/mcp-proxy") {
      fail(`${rel} blekline-proxy must use npx -y @blekline/mcp-proxy`);
    }
    const token = blekline?.env?.BLEKLINE_WORKSPACE_TOKEN ?? "";
    if (token !== PLACEHOLDER) {
      fail(`${rel} must use placeholder ${PLACEHOLDER}`);
    }
    if (LIVE_HEX_TOKEN.test(readFileSync(join(PLUGIN, rel), "utf8"))) {
      fail(`${rel} must not contain live hex workspace tokens`);
    }
    if (blekline?.args?.some((a) => a.includes(".cursor/blekline"))) {
      fail(`${rel} must not use Cursor workspace launchers`);
    }
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
    for (const group of entries) {
      for (const hook of group.hooks ?? []) {
        const cmd = hook.command ?? "";
        if (cmd.includes("node ") || cmd.endsWith(".mjs")) fail("hooks must use shell wrappers, not bare node");
        if (!cmd.endsWith(".sh")) fail(`hook command must end with .sh: ${cmd}`);
        const base = cmd.replace(/\$\{PLUGIN_ROOT\}\/hooks\//, "").replace(/\.sh$/, "");
        if (!existsSync(join(PLUGIN, "hooks", `${base}.cmd`))) fail(`missing Windows wrapper for ${base}`);
      }
    }
  }
}

function checkReadmeClaims() {
  const readme = readFileSync(join(PLUGIN, "README.md"), "utf8");
  if (!/ingress|Responses API/i.test(readme)) {
    fail("README must state silent auto-send uses ingress on the OpenAI Responses API");
  }
  if (LIVE_HEX_TOKEN.test(readme)) fail("README must not contain real-looking workspace tokens");
  if (/\/Users\/[^\s]+/.test(readme)) fail("README must not contain home directory paths");
}

function main() {
  checkManifest();
  checkMcp();
  checkSkills();
  checkCommands();
  checkHooks();
  checkReadmeClaims();
  if (failures.length) {
    console.error("codex-plugin-submission-audit FAILED:");
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("codex-plugin-submission-audit OK");
}

main();
