#!/usr/bin/env node
/**
 * Verify integration *.example configs: valid JSON/TOML shape, no live tokens.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const TRACKED_LIVE_CONFIGS = [
  ".cursor/mcp.json",
  ".cursor/hooks.json",
  ".cursor/blekline",
  ".blekline/cursor.json",
  ".blekline/codex.json",
  ".blekline/policy.json",
  ".blekline/mcp.env",
  ".claude/settings.json",
  ".codex/config.toml",
  ".codex/hooks.json",
  ".vscode/mcp.json",
  ".vscode/continue.config.json",
  "config/claude_desktop_config.generated.json",
  "config/claude-desktop.generated.json",
];

const PLACEHOLDER_TOKEN = "blw_replace_with_workspace_token";
const LIVE_TOKEN = /\bblw_live_[A-Za-z0-9]+\b/;
const LIVE_HEX_TOKEN = /\bblw_[a-f0-9]{24,}\b/i;
const HOME_PATH = /\/Users\/[^\s"'`]+/;

/** OSS clone checks repo root; private monorepo checks synced oss/ staging */
function liveConfigCheckRoot() {
  const ossManifest = join(ROOT, "oss", "integrations", "manifest.json");
  if (existsSync(ossManifest)) return join(ROOT, "oss");
  return ROOT;
}
const manifest = JSON.parse(readFileSync(join(ROOT, "integrations/manifest.json"), "utf8"));

const errors = [];

const liveRoot = liveConfigCheckRoot();
for (const rel of TRACKED_LIVE_CONFIGS) {
  if (existsSync(join(liveRoot, rel))) {
    errors.push(`LIVE CONFIG PRESENT: ${rel} under ${liveRoot === ROOT ? "repo root" : "oss/"} (ship only *.example)`);
  }
}

for (const entry of manifest.entries) {
  if (!entry.repoPath || entry.repoPath.endsWith("/")) continue;
  const full = join(ROOT, entry.repoPath);
  if (!existsSync(full)) {
    errors.push(`MISSING: ${entry.repoPath}`);
    continue;
  }
  const text = readFileSync(full, "utf8");
  if (LIVE_TOKEN.test(text)) {
    errors.push(`LIVE TOKEN in ${entry.repoPath}`);
  }
  if (LIVE_HEX_TOKEN.test(text) && !entry.repoPath.endsWith(".example")) {
    errors.push(`LIVE HEX TOKEN in ${entry.repoPath}`);
  }
  if (HOME_PATH.test(text) && !entry.repoPath.endsWith(".example")) {
    errors.push(`HOME PATH in ${entry.repoPath}`);
  }
  if (entry.repoPath.endsWith(".json") || entry.repoPath.endsWith(".json.example")) {
    try {
      JSON.parse(text);
    } catch (e) {
      errors.push(`INVALID JSON ${entry.repoPath}: ${e.message}`);
    }
  }
  if (entry.configFormat === "mcp-json" || entry.configFormat === "claude-desktop") {
    const j = JSON.parse(text);
    if (!j.mcpServers?.blekline) {
      errors.push(`MISSING mcpServers.blekline in ${entry.repoPath}`);
    }
  }
  if (entry.configFormat === "claude-code-settings") {
    const j = JSON.parse(text);
    if (!j.mcpServers?.blekline) {
      errors.push(`MISSING mcpServers.blekline in ${entry.repoPath}`);
    }
    if (!j.permissions?.allow?.length) {
      errors.push(`MISSING permissions.allow in ${entry.repoPath}`);
    }
  }
}

function assertPluginMcp(rel, opts) {
  const full = join(ROOT, rel);
  if (!existsSync(full)) {
    errors.push(`MISSING ${rel}`);
    return;
  }
  const text = readFileSync(full, "utf8");
  if (LIVE_HEX_TOKEN.test(text)) errors.push(`LIVE HEX TOKEN in ${rel}`);
  if (HOME_PATH.test(text)) errors.push(`HOME PATH in ${rel}`);
  const j = JSON.parse(text);
  const blekline = j.mcpServers?.blekline;
  if (!blekline) {
    errors.push(`MISSING mcpServers.blekline in ${rel}`);
    return;
  }
  if (opts.command && blekline.command !== opts.command) {
    errors.push(`${rel} blekline.command must be ${opts.command}`);
  }
  if (opts.token === "variable" && blekline.env?.BLEKLINE_WORKSPACE_TOKEN !== "${BLEKLINE_WORKSPACE_TOKEN}") {
    errors.push(`${rel} must use \${BLEKLINE_WORKSPACE_TOKEN}`);
  }
  if (opts.token === "placeholder" && blekline.env?.BLEKLINE_WORKSPACE_TOKEN !== PLACEHOLDER_TOKEN) {
    errors.push(`${rel} must use ${PLACEHOLDER_TOKEN}`);
  }
  if (opts.envFile && blekline.envFile !== opts.envFile) {
    errors.push(`${rel} envFile must be ${opts.envFile}`);
  }
  if (opts.launcher && !blekline.args?.[0]?.includes(opts.launcher)) {
    errors.push(`${rel} must use ${opts.launcher}`);
  }
  if (opts.forbidLauncher && blekline.args?.some((a) => a.includes(opts.forbidLauncher))) {
    errors.push(`${rel} must not use ${opts.forbidLauncher}`);
  }
}

assertPluginMcp("plugins/cursor/mcp.json", {
  command: "node",
  token: "variable",
  envFile: ".blekline/mcp.env",
  launcher: ".cursor/blekline/run-mcp-server.mjs",
});
assertPluginMcp("plugins/codex/.mcp.json", {
  command: "npx",
  token: "placeholder",
  forbidLauncher: ".cursor/blekline",
});

const hooksExample = join(ROOT, ".cursor/hooks.json.example");
if (!existsSync(hooksExample)) {
  errors.push("MISSING .cursor/hooks.json.example");
} else {
  const hooks = JSON.parse(readFileSync(hooksExample, "utf8"));
  if (!hooks.hooks?.beforeSubmitPrompt?.length) {
    errors.push("MISSING hooks.beforeSubmitPrompt in .cursor/hooks.json.example");
  }
  const cmd = hooks.hooks?.beforeSubmitPrompt?.[0]?.command;
  if (typeof cmd !== "string" || !cmd.includes(".cursor/hooks/")) {
    errors.push("beforeSubmitPrompt must use .cursor/hooks/*.sh command path (not bare node + args)");
  }
}

for (const sh of [
  ".cursor/hooks/blekline-mask-prompt.sh",
  ".cursor/hooks/blekline-session-start.sh",
  ".cursor/hooks/blekline-before-read-file.sh",
]) {
  if (!existsSync(join(ROOT, sh))) {
    errors.push(`MISSING ${sh}`);
  }
}

const cursorCfgExample = join(ROOT, "config/blekline/cursor.json.example");
if (!existsSync(cursorCfgExample)) {
  errors.push("MISSING config/blekline/cursor.json.example");
}

const policyExample = join(ROOT, ".blekline/policy.json.example");
if (!existsSync(policyExample)) {
  errors.push("MISSING .blekline/policy.json.example");
}

const mcpEnvExample = join(ROOT, ".blekline/mcp.env.example");
if (!existsSync(mcpEnvExample)) {
  errors.push("MISSING .blekline/mcp.env.example");
} else {
  const text = readFileSync(mcpEnvExample, "utf8");
  if (LIVE_HEX_TOKEN.test(text)) errors.push("LIVE HEX TOKEN in .blekline/mcp.env.example");
  if (/^BLEKLINE_WORKSPACE_ROOT=\/[^\s]+/m.test(text)) {
    errors.push(".blekline/mcp.env.example must leave BLEKLINE_WORKSPACE_ROOT empty");
  }
}

const chatGuardExample = join(ROOT, ".cursor/rules/blekline-chat-guard.mdc.example");
const chatGuardPlugin = join(ROOT, "plugins/cursor/rules/blekline-chat-guard.mdc");
if (!existsSync(chatGuardExample)) {
  errors.push("MISSING .cursor/rules/blekline-chat-guard.mdc.example");
} else if (existsSync(chatGuardPlugin)) {
  const example = readFileSync(chatGuardExample, "utf8");
  const plugin = readFileSync(chatGuardPlugin, "utf8");
  if (!/block \+ clipboard|clipboard.*block/i.test(example)) {
    errors.push("blekline-chat-guard.mdc.example must document block + clipboard behavior");
  }
  if (example.replace(/^---[\s\S]*?---\n/, "") !== plugin.replace(/^---[\s\S]*?---\n/, "")) {
    errors.push("blekline-chat-guard.mdc.example body must match plugins/cursor/rules/blekline-chat-guard.mdc");
  }
}

if (existsSync(join(liveRoot, ".cursor/rules/git-and-public-safety.mdc"))) {
  errors.push("git-and-public-safety.mdc present in public tree (private operator rule only)");
}

if (errors.length) {
  console.error("verify-integration-configs FAILED:\n");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`verify-integration-configs OK (${manifest.entries.filter((e) => e.configFormat).length} configs)`);
