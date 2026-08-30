import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const PLACEHOLDER = "blw_replace_with_workspace_token";

export function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function isWorkspaceRoot(dir) {
  return (
    existsSync(join(dir, ".cursor")) ||
    existsSync(join(dir, ".blekline")) ||
    existsSync(join(dir, "pnpm-workspace.yaml")) ||
    existsSync(join(dir, "integrations", "manifest.json"))
  );
}

function walkUpForWorkspace(startDir) {
  let dir = resolve(startDir);
  for (let i = 0; i < 16; i += 1) {
    if (isWorkspaceRoot(dir)) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export function findWorkspaceRoot(startDir = process.cwd()) {
  const envCandidates = [
    process.env.BLEKLINE_WORKSPACE_ROOT,
    process.env.CURSOR_WORKSPACE_FOLDER,
    process.env.VSCODE_CWD,
    process.env.INIT_CWD,
  ];

  for (const candidate of envCandidates) {
    if (!candidate?.trim()) continue;
    const hit = walkUpForWorkspace(candidate.trim());
    if (hit) return hit;
  }

  const fromCwd = walkUpForWorkspace(startDir);
  if (fromCwd && isWorkspaceRoot(fromCwd)) return fromCwd;

  return resolve(startDir);
}

function loadDotEnv(path) {
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

function tokenLooksValid(token) {
  return Boolean(token && !token.includes("${") && token !== PLACEHOLDER);
}

export function resolveToken(root) {
  let token = process.env.BLEKLINE_WORKSPACE_TOKEN?.trim() ?? "";
  if (!tokenLooksValid(token)) {
    const mcpEnv = loadDotEnv(join(root, ".blekline", "mcp.env"));
    token = mcpEnv.BLEKLINE_WORKSPACE_TOKEN?.trim() ?? "";
  }
  if (!tokenLooksValid(token)) {
    const cfg = readJson(join(root, ".blekline", "cursor.json"));
    if (typeof cfg?.workspaceToken === "string") token = cfg.workspaceToken.trim();
  }
  if (!tokenLooksValid(token)) {
    const mcp = readJson(join(root, ".cursor", "mcp.json"));
    const fromMcp = mcp?.mcpServers?.blekline?.env?.BLEKLINE_WORKSPACE_TOKEN;
    if (typeof fromMcp === "string") token = fromMcp.trim();
  }
  if (!tokenLooksValid(token)) {
    console.error(
      "[blekline] Missing workspace token. Run `npx @blekline/cursor-hooks init`, set workspaceToken in .blekline/cursor.json, then reload MCP.",
    );
    process.exit(1);
  }
  return token;
}

export function resolveApiUrl(root) {
  let url = process.env.BLEKLINE_API_URL?.trim() ?? "";
  if (!url || url.includes("${")) {
    const mcpEnv = loadDotEnv(join(root, ".blekline", "mcp.env"));
    if (mcpEnv.BLEKLINE_API_URL?.trim()) url = mcpEnv.BLEKLINE_API_URL.trim();
  }
  if (!url || url.includes("${")) {
    const cfg = readJson(join(root, ".blekline", "cursor.json"));
    if (typeof cfg?.apiUrl === "string" && cfg.apiUrl.trim()) url = cfg.apiUrl.trim();
  }
  return url || "https://app.blekline.com";
}
