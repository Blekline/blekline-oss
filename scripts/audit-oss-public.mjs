#!/usr/bin/env node
/**
 * Fail if paths or patterns that must stay private appear in OSS sync sources.
 *
 * Usage: node scripts/audit-oss-public.mjs
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATES = join(ROOT, "templates/oss");
const PACKAGES = join(ROOT, "packages");
const DEMO = join(ROOT, "demo");
const DOC_SRC = join(ROOT, "webapp/content/docs");
const OSS_MIRROR = join(ROOT, "oss");
const IS_OSS_CLONE =
  !existsSync(TEMPLATES) && existsSync(join(ROOT, "integrations", "manifest.json"));

const FORBIDDEN_PATHS = [
  "outreach",
  "OPEN_CORE_LAUNCH.md",
  "SHOW_HN.md",
  "BLITZ_DEMO.md",
  "outreach-private",
  "connectors-private",
  "connectors",
  "runtime-engine",
  "k8s-admission",
  "enterprise-private",
  "outreach-private",
];

/** Private package dirs — excluded from OSS sync source scan (live in private monorepo only) */
const PRIVATE_PACKAGE_DIRS = new Set(["runtime-engine", "k8s-admission"]);

const FORBIDDEN_PATTERNS = [
  { id: "private-monorepo-url", pattern: /github\.com\/Blekline\/blekline(?!-oss)/i },
  { id: "copy-inspiration", pattern: /\binspired by\b/i },
  { id: "copy-style-repo", pattern: /-style repo/i },
  { id: "copy-like-claude-md", pattern: /like .* CLAUDE\.md/i },
  { id: "live-workspace-token", pattern: /\bblw_live_[A-Za-z0-9]+\b/ },
  { id: "workspace-token-hex", pattern: /\bblw_[a-f0-9]{24,}\b/i },
  { id: "home-path", pattern: /\/Users\/[^\s"'`]+/ },
  { id: "workspace-root-absolute", pattern: /^BLEKLINE_WORKSPACE_ROOT=\/[^\s]+/m },
  { id: "named-outreach-group", pattern: /GROUP[1-4]-(angels|vuk|media|mcp|design)/i },
  { id: "skupina-outreach", pattern: /Skupina [1-4]/i },
  { id: "blitz-demo-path", pattern: /demo\/BLITZ_DEMO\.md/i },
  { id: "stripe-live", pattern: /\bsk_live_[A-Za-z0-9]+\b/ },
  { id: "stripe-test", pattern: /\bsk_test_[A-Za-z0-9]+\b/ },
  { id: "stripe-whsec", pattern: /\bwhsec_[A-Za-z0-9]+\b/ },
  { id: "github-pat", pattern: /\bghp_[A-Za-z0-9]{20,}\b/ },
  { id: "npm-token", pattern: /\bnpm_[A-Za-z0-9]{20,}\b/ },
  { id: "openai-key", pattern: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { id: "nhim-moat-runtime-engine", pattern: /packages\/runtime-engine/i },
  { id: "nhim-moat-k8s-admission", pattern: /packages\/k8s-admission/i },
  { id: "full-asi-mapping-leak", pattern: /ASI01-ASI10_MAPPING\.md/i },
  { id: "soa-template-leak", pattern: /SOA_TEMPLATE\.md/i },
  { id: "false-aiuc-cert", pattern: /AIUC-1 certified/i },
  { id: "false-owasp-cert", pattern: /OWASP certified/i },
  { id: "nhim-deploy-k8s-ref", pattern: /deploy\/k8s/i, scope: "packages/nhim-audit" },
  { id: "nhim-enterprise-private-ref", pattern: /enterprise-private|outreach-private/i, scope: "packages/nhim-audit" },
  { id: "nhim-runtime-engine-import", pattern: /@blekline\/runtime-engine|packages\/runtime-engine/i, scope: "packages/nhim-audit" },
  { id: "nhim-k8s-admission-import", pattern: /@blekline\/k8s-admission|packages\/k8s-admission/i, scope: "packages/nhim-audit" },
  { id: "nhim-private-repo-url", pattern: /github\.com\/Blekline\/blekline(?!-oss)/i, scope: "packages/nhim-audit" },
];

const ALLOWED_FAKE_EXAMPLES = [
  "AKIAIOSFODNN7EXAMPLE",
  "blw_...",
  "blw_replace",
  "sk_test_abcdefghijklmnopqrstuvwxyz",
  "john@acme.com",
  "alice@corp.com",
  "jane@acme.com",
];

/** Gitignored live configs — real tokens OK locally; never sync to OSS. */
const LOCAL_ONLY_CONFIG = new Set([
  "config/blekline/cursor.json",
  "config/claude_desktop_config.generated.json",
  "config/claude-desktop.generated.json",
  ".blekline/cursor.json",
  ".blekline/codex.json",
  ".blekline/policy.json",
  ".blekline/mcp.env",
  ".cursor/mcp.json",
  ".cursor/hooks.json",
  ".cursor/blekline",
  ".cursor/rules/blekline-chat-guard.mdc",
  ".cursor/rules/git-and-public-safety.mdc",
  ".claude/settings.json",
  ".vscode/continue.config.json",
  ".vscode/mcp.json",
  ".codex/config.toml",
  ".codex/hooks.json",
]);

function stripAllowedExamples(text) {
  let out = text;
  for (const sample of ALLOWED_FAKE_EXAMPLES) {
    out = out.split(sample).join("");
  }
  return out;
}

function matchesForbiddenPattern(text, { id, pattern }) {
  const probe = id === "stripe-test" || id === "openai-key" ? stripAllowedExamples(text) : text;
  pattern.lastIndex = 0;
  return pattern.test(probe);
}

function skipPatternScan(rel, id) {
  if (id === "workspace-token-hex" && skipWorkspaceTokenHexScan(rel)) return true;
  if (id === "workspace-root-absolute" && rel.endsWith(".example")) return true;
  if ((id === "home-path" || id === "workspace-root-absolute") && LOCAL_ONLY_CONFIG.has(rel)) return true;
  if (id === "home-path" && rel.endsWith(".generated.json")) return true;
  if (rel === ".cursor/rules/git-and-public-safety.mdc") return true;
  return false;
}

function skipWorkspaceTokenHexScan(rel) {
  if (LOCAL_ONLY_CONFIG.has(rel)) return true;
  if (rel.endsWith(".generated.json")) return true;
  return false;
}

function walk(dir, files = [], relBase = "") {
  if (!existsSync(dir)) return files;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (name === "node_modules" || name === "dist" || name === ".git") continue;
    if (name === "pending-mask" && dir.endsWith(".blekline")) continue;
    if (dir === PACKAGES && PRIVATE_PACKAGE_DIRS.has(name)) continue;
    const st = statSync(path);
    if (st.isDirectory()) walk(path, files);
    else if (/\.(md|mdc|json|yaml|yml|mjs|js|ts|toml|sh|cmd|example|env(?:\.example)?)$/i.test(name)) {
      files.push(path);
    }
  }
  return files;
}

function isForbiddenPath(rel) {
  const parts = rel.split("/");
  return FORBIDDEN_PATHS.some((f) => parts.includes(f) || rel === f || rel.endsWith(`/${f}`));
}

const EXTRA_DIRS = ["cli", "ci", "integrations", "install", "examples", "config", "plugins", "vscode-extension"].map(
  (p) => join(ROOT, p)
);
const DOT_SCAN = [".cursor", ".claude", ".vscode", ".codex", ".blekline"].map((p) => join(ROOT, p));
const scanRoots = [
  TEMPLATES,
  PACKAGES,
  DEMO,
  ...EXTRA_DIRS.filter(existsSync),
  ...DOT_SCAN.filter(existsSync),
];
const extraFiles = [join(ROOT, "AGENTS.md")].filter(existsSync);
const errors = [];

const allScanFiles = [...extraFiles];
for (const root of scanRoots) {
  allScanFiles.push(...walk(root));
}

for (const file of allScanFiles) {
    const rel = relative(ROOT, file);
    if (isForbiddenPath(rel)) {
      errors.push(`FORBIDDEN PATH: ${rel}`);
      continue;
    }
    const text = readFileSync(file, "utf8");
  for (const { id, pattern, scope } of FORBIDDEN_PATTERNS) {
    if (scope && !rel.startsWith(scope)) continue;
    if (skipPatternScan(rel, id)) continue;
    if (matchesForbiddenPattern(text, { id, pattern })) {
      errors.push(`PATTERN ${id}: ${rel}`);
    }
  }
}

const OSS_DOCS_STUB = join(TEMPLATES, "docs");
if (existsSync(OSS_DOCS_STUB)) {
  for (const file of walk(OSS_DOCS_STUB)) {
    const rel = relative(ROOT, file);
    if (rel !== "templates/oss/docs/README.md") {
      errors.push(`OSS DOCS STUB ONLY: ${rel} (remove; docs live on app.blekline.com)`);
    }
  }
}

const DOC_SCAN_DIRS = [
  join(DOC_SRC, "introduction"),
  join(DOC_SRC, "integrations"),
  join(DOC_SRC, "mcp"),
  join(DOC_SRC, "security"),
  join(DOC_SRC, "enterprise"),
];

const OSS_FORBIDDEN_PATHS = [
  ".blekline/mcp.env",
  ".cursor/blekline",
  ".cursor/rules/git-and-public-safety.mdc",
];

const AUDIT_META_FILES = new Set(["scripts/audit-oss-public.mjs"]);

function auditScannedFile(baseRoot, file, labelPrefix, errors) {
  const rel = relative(baseRoot, file);
  if (AUDIT_META_FILES.has(rel)) return;
  const label = labelPrefix ? `${labelPrefix}/${rel}` : rel;
  if (isForbiddenPath(rel)) {
    errors.push(`FORBIDDEN PATH: ${label}`);
    return;
  }
  const text = readFileSync(file, "utf8");
  for (const { id, pattern, scope } of FORBIDDEN_PATTERNS) {
    if (scope && !rel.startsWith(scope)) continue;
    if (skipPatternScan(rel, id)) continue;
    if (matchesForbiddenPattern(text, { id, pattern })) {
      errors.push(`PATTERN ${id}: ${label}`);
    }
  }
}

for (const dir of DOC_SCAN_DIRS) {
  if (!existsSync(dir)) continue;
  for (const file of walk(dir)) {
    auditScannedFile(ROOT, file, null, errors);
  }
}

if (IS_OSS_CLONE) {
  for (const rel of OSS_FORBIDDEN_PATHS) {
    if (existsSync(join(ROOT, rel))) {
      errors.push(`FORBIDDEN PATH: ${rel}`);
    }
  }
  const cloneScanRoots = [
    join(ROOT, "packages"),
    join(ROOT, "demo"),
    join(ROOT, "cli"),
    join(ROOT, "ci"),
    join(ROOT, "integrations"),
    join(ROOT, "install"),
    join(ROOT, "examples"),
    join(ROOT, "config"),
    join(ROOT, "plugins"),
    join(ROOT, "vscode-extension"),
    ...[".cursor", ".claude", ".vscode", ".codex", ".blekline"].map((p) => join(ROOT, p)),
  ].filter(existsSync);
  for (const root of cloneScanRoots) {
    for (const file of walk(root)) {
      auditScannedFile(ROOT, file, null, errors);
    }
  }
  for (const rel of ["SECURITY.md", "AGENTS.md", "README.md"]) {
    const file = join(ROOT, rel);
    if (existsSync(file)) auditScannedFile(ROOT, file, null, errors);
  }
} else if (existsSync(OSS_MIRROR)) {
  for (const rel of OSS_FORBIDDEN_PATHS) {
    if (existsSync(join(OSS_MIRROR, rel))) {
      errors.push(`OSS MIRROR FORBIDDEN PATH: oss/${rel}`);
    }
  }
  for (const file of walk(OSS_MIRROR)) {
    auditScannedFile(OSS_MIRROR, file, "oss", errors);
  }
}

if (errors.length > 0) {
  console.error("OSS public audit FAILED:\n");
  for (const e of errors) console.error(`  - ${e}`);
  console.error("\nFix before pnpm sync:oss or pushing blekline-oss.");
  process.exit(1);
}

console.log(
  IS_OSS_CLONE
    ? "OSS public audit OK — blekline-oss clone has no forbidden paths or sensitive patterns."
    : "OSS public audit OK — no forbidden paths or sensitive patterns in sync sources or oss/ mirror (docs host on app.blekline.com only)."
);
