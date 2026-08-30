import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  cursorHookFieldsForMaskBackend,
  parseMaskBackend,
} from "../../client-hooks/lib/mask-backend.mjs";

const PLACEHOLDER_TOKEN = "blw_replace_with_workspace_token";
const DEFAULT_API_URL = "https://app.blekline.com";

/** @typedef {'auto_mask' | 'block' | 'agent' | 'off'} PromptPolicy */

/**
 * @typedef {object} CursorHookConfig
 * @property {string} apiUrl
 * @property {string} workspaceToken
 * @property {string} platform
 * @property {PromptPolicy} promptPolicy
 * @property {'local_first' | 'always_cloud'} promptGuardMode
 * @property {'local' | 'cloud'} promptMaskSource
 * @property {boolean} failClosed
 * @property {boolean} readGuard
 * @property {boolean} shellGuard
 * @property {boolean} toolGuard
 * @property {boolean} mcpGuard
 * @property {'local' | 'cloud'} shellGuardMode
 * @property {'local' | 'auto'} mcpGuardMode
 * @property {boolean} enterprisePreset
 * @property {boolean} copyMaskedToClipboard
 * @property {boolean} emitAuditEvents
 * @property {boolean} showMaskedInUi
 * @property {'local' | 'hosted' | 'sidecar'} maskBackend
 * @property {string} [sidecarUrl]
 * @property {number} maskTimeoutMs
 */

function readJsonFile(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export function findWorkspaceRoot(startDir = process.cwd()) {
  let dir = resolve(startDir);
  for (let i = 0; i < 12; i += 1) {
    if (
      existsSync(join(dir, ".cursor")) ||
      existsSync(join(dir, ".codex")) ||
      existsSync(join(dir, ".blekline")) ||
      existsSync(join(dir, "integrations", "manifest.json")) ||
      existsSync(join(dir, "pnpm-workspace.yaml"))
    ) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(startDir);
}

function loadDotEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function tokenFromMcpJson(root) {
  const mcpPath = join(root, ".cursor", "mcp.json");
  const mcp = readJsonFile(mcpPath);
  const token = mcp?.mcpServers?.blekline?.env?.BLEKLINE_WORKSPACE_TOKEN;
  if (typeof token !== "string") return "";
  const trimmed = token.trim();
  if (!trimmed || trimmed.startsWith("${env:") || trimmed === PLACEHOLDER_TOKEN) return "";
  return trimmed;
}

/**
 * Resolve Blekline Cursor hook config (plug-and-play order):
 * 1. `.blekline/cursor.json`
 * 2. Environment variables
 * 3. Repo `.env` / `webapp/.env.local`
 * 4. `.cursor/mcp.json` blekline env block
 *
 * @param {string} [cwd]
 * @returns {CursorHookConfig}
 */
export function loadCursorHookConfig(cwd = process.cwd()) {
  const root = findWorkspaceRoot(cwd);
  const fileCfg = readJsonFile(join(root, ".blekline", "cursor.json")) ?? {};

  const dotenv = {
    ...loadDotEnvFile(join(root, ".env")),
    ...loadDotEnvFile(join(root, "webapp", ".env.local")),
  };

  const apiUrl =
    String(fileCfg.apiUrl ?? process.env.BLEKLINE_API_URL ?? dotenv.BLEKLINE_API_URL ?? DEFAULT_API_URL).trim() ||
    DEFAULT_API_URL;

  const workspaceToken =
    String(
      fileCfg.workspaceToken ??
        process.env.BLEKLINE_WORKSPACE_TOKEN ??
        dotenv.BLEKLINE_WORKSPACE_TOKEN ??
        dotenv.BLEKLINE_SAMPLE_WORKSPACE_TOKEN ??
        tokenFromMcpJson(root) ??
        ""
    ).trim() || "";

  const promptPolicyRaw = String(
    fileCfg.promptPolicy ?? process.env.BLEKLINE_CURSOR_PROMPT_POLICY ?? "auto_mask"
  ).trim();

  /** @type {PromptPolicy} */
  const promptPolicy =
    promptPolicyRaw === "block" || promptPolicyRaw === "agent" || promptPolicyRaw === "off"
      ? promptPolicyRaw
      : "auto_mask";

  const promptGuardModeRaw = String(
    fileCfg.promptGuardMode ?? process.env.BLEKLINE_CURSOR_PROMPT_GUARD_MODE ?? "local_first"
  ).trim();
  const promptGuardMode = promptGuardModeRaw === "always_cloud" ? "always_cloud" : "local_first";

  const promptMaskSourceRaw = String(
    fileCfg.promptMaskSource ?? process.env.BLEKLINE_CURSOR_PROMPT_MASK_SOURCE ?? "local"
  ).trim();
  let promptMaskSource = promptMaskSourceRaw === "cloud" ? "cloud" : "local";

  const policyJson = readJsonFile(join(root, ".blekline", "policy.json"));
  const policyBackend = parseMaskBackend(
    policyJson?.maskBackend ?? process.env.BLEKLINE_MASK_BACKEND
  );
  const maskBackend =
    policyBackend ?? (promptMaskSource === "cloud" ? "hosted" : "local");
  const backendFields = cursorHookFieldsForMaskBackend(maskBackend, {
    apiUrl,
    sidecarUrl:
      typeof fileCfg.sidecarUrl === "string"
        ? fileCfg.sidecarUrl
        : process.env.BLEKLINE_SIDECAR_URL,
  });
  promptMaskSource = backendFields.promptMaskSource;
  const resolvedApiUrl = backendFields.apiUrl ?? apiUrl;

  const enterprisePreset =
    fileCfg.enterprisePreset === true || process.env.BLEKLINE_CURSOR_ENTERPRISE_PRESET === "1";

  const failClosed =
    enterprisePreset ||
    fileCfg.failClosed === true ||
    process.env.BLEKLINE_CURSOR_HOOK_FAIL_CLOSED === "1" ||
    process.env.BLEKLINE_CURSOR_HOOK_FAIL_CLOSED === "true";

  const readGuard =
    enterprisePreset ||
    (fileCfg.readGuard !== false && process.env.BLEKLINE_CURSOR_READ_GUARD !== "0");

  const shellGuard =
    enterprisePreset ||
    (fileCfg.shellGuard !== false && process.env.BLEKLINE_CURSOR_SHELL_GUARD !== "0");

  const toolGuard =
    enterprisePreset ||
    (fileCfg.toolGuard !== false && process.env.BLEKLINE_CURSOR_TOOL_GUARD !== "0");

  const mcpGuard =
    enterprisePreset ||
    (fileCfg.mcpGuard !== false && process.env.BLEKLINE_CURSOR_MCP_GUARD !== "0");

  const shellGuardModeRaw = String(
    fileCfg.shellGuardMode ?? process.env.BLEKLINE_CURSOR_SHELL_GUARD_MODE ?? "local"
  ).trim();
  const shellGuardMode = shellGuardModeRaw === "cloud" ? "cloud" : "local";

  const mcpGuardModeRaw = String(
    fileCfg.mcpGuardMode ?? process.env.BLEKLINE_CURSOR_MCP_GUARD_MODE ?? "local"
  ).trim();
  const mcpGuardMode = mcpGuardModeRaw === "auto" ? "auto" : "local";

  const copyMaskedToClipboard =
    fileCfg.copyMaskedToClipboard !== false &&
    process.env.BLEKLINE_CURSOR_COPY_MASKED !== "0";

  const emitAuditEvents =
    fileCfg.emitAuditEvents !== false && process.env.BLEKLINE_CURSOR_EMIT_AUDIT !== "0";

  const showMaskedInUi =
    fileCfg.showMaskedInUi === true || process.env.BLEKLINE_CURSOR_SHOW_MASKED_IN_UI === "1";

  const maskTimeoutMs = Number.parseInt(
    String(fileCfg.maskTimeoutMs ?? process.env.BLEKLINE_CURSOR_MASK_TIMEOUT_MS ?? "3500"),
    10
  );

  return {
    apiUrl: resolvedApiUrl,
    workspaceToken,
    platform: String(fileCfg.platform ?? "cursor"),
    promptPolicy,
    promptGuardMode,
    promptMaskSource,
    maskBackend,
    sidecarUrl: backendFields.sidecarUrl,
    failClosed,
    readGuard,
    shellGuard,
    toolGuard,
    mcpGuard,
    shellGuardMode,
    mcpGuardMode,
    enterprisePreset,
    copyMaskedToClipboard,
    emitAuditEvents,
    showMaskedInUi,
    maskTimeoutMs: Number.isFinite(maskTimeoutMs) ? Math.min(8000, Math.max(1500, maskTimeoutMs)) : 3500,
  };
}

export function isConfigured(config) {
  return Boolean(config.workspaceToken && config.workspaceToken !== PLACEHOLDER_TOKEN);
}
