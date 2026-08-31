#!/usr/bin/env node
/**
 * Generate MCP integration configs from integrations/manifest.json.
 *
 * Usage:
 *   node scripts/generate-mcp-configs.mjs           # monorepo *.example paths
 *   node scripts/generate-mcp-configs.mjs --local   # live gitignored configs
 *   node scripts/generate-mcp-configs.mjs --oss     # npx @blekline/* paths (blekline-oss)
 *   node scripts/generate-mcp-configs.mjs --plugin cursor
 *   node scripts/generate-mcp-configs.mjs --plugin codex
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const claudeCodePermissions = require("./lib/claude-code-permissions.json");
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const isLocal = process.argv.includes("--local");
const isOss = process.argv.includes("--oss");
const useExampleSuffix = !isLocal;

function pluginFlags() {
  const names = [];
  for (let i = 0; i < process.argv.length; i += 1) {
    if (process.argv[i] === "--plugin" && process.argv[i + 1] && !process.argv[i + 1].startsWith("-")) {
      names.push(process.argv[i + 1]);
    }
  }
  return names;
}

const requestedPlugins = pluginFlags();
const pluginOnly = requestedPlugins.length > 0;

function parseEnvFile(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function loadEnv() {
  return {
    ...process.env,
    ...parseEnvFile(envPath),
    ...parseEnvFile(resolve(root, "webapp", ".env.local")),
  };
}

const PLACEHOLDER_TOKEN = "blw_replace_with_workspace_token";

function resolveWorkspaceToken() {
  if (isLocal) {
    return (
      env.BLEKLINE_WORKSPACE_TOKEN ??
      env.BLEKLINE_SAMPLE_WORKSPACE_TOKEN ??
      PLACEHOLDER_TOKEN
    );
  }
  return PLACEHOLDER_TOKEN;
}

const env = loadEnv();
const apiUrl = env.BLEKLINE_API_URL ?? env.BLEKLINE_APP_ORIGIN ?? "https://app.blekline.com";
const token = resolveWorkspaceToken();
const absRoot = root.replace(/\\/g, "/");

function serverCommand() {
  if (isOss) {
    return { command: "npx", args: ["-y", "@blekline/mcp-server@0.4.2"] };
  }
  if (isLocal) {
    return {
      command: "node",
      args: isOss ? [] : ["${workspaceFolder}/packages/mcp-server/dist/index.js"],
    };
  }
  return {
    command: "node",
    args: ["${workspaceFolder}/packages/mcp-server/dist/index.js"],
  };
}

function proxyCommand() {
  if (isOss) {
    return { command: "npx", args: ["-y", "@blekline/mcp-proxy@0.4.2"] };
  }
  return {
    command: "node",
    args: ["${workspaceFolder}/packages/mcp-proxy/dist/index.js"],
  };
}

function envBlock(surface) {
  return {
    BLEKLINE_API_URL: apiUrl,
    BLEKLINE_WORKSPACE_TOKEN: token,
    BLEKLINE_CLIENT_SURFACE: surface,
  };
}

function proxyEnvBlock(surface) {
  const base = envBlock(surface);
  return { ...base, BLEKLINE_MCP_PROXY_MOCK: "1" };
}

function absServerArgs() {
  return [`${absRoot}/packages/mcp-server/dist/index.js`];
}

function absProxyArgs() {
  return [`${absRoot}/packages/mcp-proxy/dist/index.js`];
}

function buildMcpJson(surface, { includeProxy = true } = {}) {
  const srv = serverCommand();
  const servers = {
    blekline: {
      ...srv,
      env: envBlock(surface),
    },
  };
  if (includeProxy) {
    const prx = proxyCommand();
    servers["blekline-proxy"] = {
      ...prx,
      env: proxyEnvBlock(surface),
    };
  }
  return { mcpServers: servers };
}

function buildCursorHooksJson() {
  const failClosedHook = { failClosed: true };
  return {
    version: 1,
    hooks: {
      sessionStart: [{ command: ".cursor/hooks/blekline-session-start.sh" }],
      beforeSubmitPrompt: [{ command: ".cursor/hooks/blekline-mask-prompt.sh", timeout: 5 }],
      beforeReadFile: [{ command: ".cursor/hooks/blekline-before-read-file.sh", ...failClosedHook }],
      beforeShellExecution: [
        {
          command: ".cursor/hooks/blekline-before-shell-execution.sh",
          matcher: "curl|wget|cat|grep|type|head|tail",
          ...failClosedHook,
        },
      ],
      preToolUse: [
        {
          command: ".cursor/hooks/blekline-pre-tool-use.sh",
          matcher: "Read|Write|Shell|Grep|Delete|edit|write_file|run_terminal_cmd",
        },
      ],
      beforeMCPExecution: [{ command: ".cursor/hooks/blekline-before-mcp-execution.sh", ...failClosedHook }],
      afterShellExecution: [{ command: ".cursor/hooks/blekline-after-shell-execution.sh" }],
    },
  };
}

function buildCursorBleklineJson({ enterprise = false, forExample = false } = {}) {
  return {
    apiUrl,
    workspaceToken: forExample ? "blw_replace_with_workspace_token" : token,
    platform: "cursor",
    promptPolicy: "auto_mask",
    promptGuardMode: "local_first",
    promptMaskSource: "local",
    failClosed: enterprise,
    readGuard: true,
    shellGuard: enterprise,
    toolGuard: enterprise,
    mcpGuard: enterprise,
    shellGuardMode: "local",
    mcpGuardMode: "local",
    enterprisePreset: enterprise,
    copyMaskedToClipboard: true,
    emitAuditEvents: true,
    showMaskedInUi: false,
    maskTimeoutMs: 3500,
  };
}

function buildClaudeDesktop(surface) {
  if (isOss) {
    return buildMcpJson(surface, { includeProxy: true });
  }
  return {
    mcpServers: {
      blekline: {
        command: "node",
        args: absServerArgs(),
        env: envBlock(surface),
      },
      "blekline-proxy": {
        command: "node",
        args: absProxyArgs(),
        env: proxyEnvBlock(surface),
      },
    },
  };
}

function buildClaudeCodeSettings(surface) {
  const mcp = buildMcpJson(surface, { includeProxy: true });
  return {
    ...claudeCodePermissions,
    ...mcp,
  };
}

function buildContinueJson(surface) {
  const mcp = buildMcpJson(surface, { includeProxy: true });
  return {
    models: [],
    mcpServers: mcp.mcpServers,
  };
}

function buildPluginMcpJson(surface) {
  const env = {
    BLEKLINE_API_URL: apiUrl,
    BLEKLINE_WORKSPACE_TOKEN: "${BLEKLINE_WORKSPACE_TOKEN}",
    BLEKLINE_CLIENT_SURFACE: surface,
  };
  const envFile = ".blekline/mcp.env";
  return {
    mcpServers: {
      blekline: {
        command: "node",
        args: [".cursor/blekline/run-mcp-server.mjs"],
        envFile,
        env,
      },
      "blekline-proxy": {
        command: "node",
        args: [".cursor/blekline/run-mcp-proxy.mjs"],
        envFile,
        env: { ...env, BLEKLINE_MCP_PROXY_MOCK: "1" },
      },
    },
  };
}

function writePluginFile(rel, content) {
  const full = resolve(root, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, `${JSON.stringify(content, null, 2)}\n`);
  return rel;
}

function buildCodexPluginMcpJson(surface) {
  const env = {
    BLEKLINE_API_URL: apiUrl,
    BLEKLINE_WORKSPACE_TOKEN: PLACEHOLDER_TOKEN,
    BLEKLINE_CLIENT_SURFACE: surface,
  };
  return {
    mcpServers: {
      blekline: {
        command: "npx",
        args: ["-y", "@blekline/mcp-server"],
        env,
      },
      "blekline-proxy": {
        command: "npx",
        args: ["-y", "@blekline/mcp-proxy"],
        env: { ...env, BLEKLINE_MCP_PROXY_MOCK: "1" },
      },
    },
  };
}

function writePluginMcpExamples(names) {
  const out = [];
  const want = new Set(names);
  const writeCursor = names.length === 0 || want.has("cursor");
  const writeCodex = names.length === 0 || want.has("codex");
  if (writeCursor && (want.has("cursor") || existsSync(join(root, "plugins", "cursor")))) {
    const cfg = buildPluginMcpJson("cursor");
    out.push(writePluginFile("plugins/cursor/mcp.json", cfg));
    out.push(writePluginFile("plugins/cursor/mcp.json.example", cfg));
  }
  if (writeCodex && (want.has("codex") || existsSync(join(root, "plugins", "codex")))) {
    const cfg = buildCodexPluginMcpJson("codex");
    out.push(writePluginFile("plugins/codex/.mcp.json", cfg));
    out.push(writePluginFile("plugins/codex/.mcp.json.example", cfg));
  }
  return out;
}

function buildCodexToml(surface) {
  const srvCmd = isOss ? 'command = "npx"\nargs = ["-y", "@blekline/mcp-server"]' : 'command = "node"\nargs = ["packages/mcp-server/dist/index.js"]';
  const prxCmd = isOss
    ? 'command = "npx"\nargs = ["-y", "@blekline/mcp-proxy"]'
    : 'command = "node"\nargs = ["packages/mcp-proxy/dist/index.js"]';
  return `# Generated by scripts/generate-mcp-configs.mjs — placeholder token only

[mcp_servers.blekline]
${srvCmd}
enabled = true
startup_timeout_sec = 30

[mcp_servers.blekline.env]
BLEKLINE_API_URL = "${apiUrl}"
BLEKLINE_WORKSPACE_TOKEN = "${token}"
BLEKLINE_CLIENT_SURFACE = "${surface}"

[mcp_servers.blekline-proxy]
${prxCmd}
enabled = true

[mcp_servers.blekline-proxy.env]
BLEKLINE_API_URL = "${apiUrl}"
BLEKLINE_WORKSPACE_TOKEN = "${token}"
BLEKLINE_MCP_PROXY_MOCK = "1"
BLEKLINE_CLIENT_SURFACE = "${surface}"
`;
}

function outPath(repoPath) {
  if (!useExampleSuffix) {
    return repoPath.replace(/\.example$/, "");
  }
  return repoPath.endsWith(".example") ? repoPath : repoPath;
}

function writeConfig(repoPath, content, { json = true } = {}) {
  const rel = outPath(repoPath);
  const full = resolve(root, rel);
  mkdirSync(dirname(full), { recursive: true });
  const body = json ? `${JSON.stringify(content, null, 2)}\n` : content;
  writeFileSync(full, body);
  return rel;
}

function writeToml(repoPath, content) {
  const rel = outPath(repoPath);
  const full = resolve(root, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
  return rel;
}

const manifest = JSON.parse(readFileSync(join(root, "integrations/manifest.json"), "utf8"));
const written = [];

if (!pluginOnly) {
  for (const entry of manifest.entries) {
    if (!entry.configFormat) continue;
    const surface = entry.BLEKLINE_CLIENT_SURFACE;
    switch (entry.configFormat) {
      case "mcp-json": {
        const cfg = buildMcpJson(surface, {
          includeProxy: entry.includesProxy,
        });
        written.push(writeConfig(entry.repoPath, cfg));
        break;
      }
      case "claude-desktop": {
        const cfg = buildClaudeDesktop(surface);
        const path =
          isLocal && !useExampleSuffix
            ? "config/claude_desktop_config.generated.json"
            : entry.repoPath;
        written.push(writeConfig(path, cfg));
        break;
      }
      case "claude-code-settings": {
        const cfg = buildClaudeCodeSettings(surface);
        written.push(writeConfig(entry.repoPath, cfg));
        break;
      }
      case "continue-json": {
        const cfg = buildContinueJson(surface);
        written.push(writeConfig(entry.repoPath, cfg));
        break;
      }
      case "codex-toml": {
        written.push(writeToml(entry.repoPath, buildCodexToml(surface)));
        break;
      }
      default:
        break;
    }
  }

  if (isLocal) {
    written.push(writeConfig(".cursor/hooks.json", buildCursorHooksJson()));
    written.push(writeConfig(".blekline/cursor.json", buildCursorBleklineJson({ enterprise: true })));
    const ruleExample = join(root, ".cursor/rules/blekline-chat-guard.mdc.example");
    const ruleLive = join(root, ".cursor/rules/blekline-chat-guard.mdc");
    if (existsSync(ruleExample)) {
      mkdirSync(dirname(ruleLive), { recursive: true });
      copyFileSync(ruleExample, ruleLive);
      written.push(".cursor/rules/blekline-chat-guard.mdc");
    }
  } else {
    written.push(writeConfig(".cursor/hooks.json.example", buildCursorHooksJson()));
    written.push(writeConfig("config/blekline/cursor.json.example", buildCursorBleklineJson({ enterprise: true, forExample: true })));
  }
}

written.push(...writePluginMcpExamples(requestedPlugins));

console.log(`Generated (${pluginOnly ? `plugin ${requestedPlugins.join(",")}` : isLocal ? "local" : isOss ? "oss" : "example"}):`);
for (const p of written) console.log(`  ${p}`);
