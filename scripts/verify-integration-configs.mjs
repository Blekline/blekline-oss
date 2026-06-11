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
  ".claude/settings.json",
  ".codex/config.toml",
  ".vscode/mcp.json",
  "config/claude_desktop_config.generated.json",
  "config/claude-desktop.generated.json",
];

/** OSS clone checks repo root; private monorepo checks synced oss/ staging */
function liveConfigCheckRoot() {
  const ossManifest = join(ROOT, "oss", "integrations", "manifest.json");
  if (existsSync(ossManifest)) return join(ROOT, "oss");
  return ROOT;
}
const manifest = JSON.parse(readFileSync(join(ROOT, "integrations/manifest.json"), "utf8"));

const LIVE_TOKEN = /\bblw_live_[A-Za-z0-9]+\b/;
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

if (errors.length) {
  console.error("verify-integration-configs FAILED:\n");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`verify-integration-configs OK (${manifest.entries.filter((e) => e.configFormat).length} configs)`);
