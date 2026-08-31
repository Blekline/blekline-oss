import { randomUUID } from "node:crypto";
import { enforceToolCallLocally } from "@blekline/contracts";
import { emitGovernanceEvent } from "./emit-governance.mjs";

const DEFAULT_PROXY_SERVER_NAMES = ["blekline-proxy", "blekline-mcp-proxy"];

function configuredProxyServerNames() {
  const raw = process.env.BLEKLINE_CURSOR_PROXY_SERVER_NAMES?.trim();
  if (!raw) return DEFAULT_PROXY_SERVER_NAMES;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Exact match for Blekline MCP proxy — substring bypass is rejected.
 * @param {object} input
 * @returns {boolean}
 */
function isBleklineProxyServer(input) {
  const serverName = typeof input?.server === "string" ? input.server.trim() : "";
  if (serverName && configuredProxyServerNames().includes(serverName)) {
    return true;
  }

  const command = typeof input?.command === "string" ? input.command : "";
  if (/\bnpx\b.*@blekline\/mcp-proxy(?:@\d|@|\s|$)/.test(command)) return true;
  if (/\bnode\b.*[/\\]mcp-proxy[/\\]/.test(command)) return true;
  if (/\bnode\b.*[/\\]packages[/\\]mcp-proxy[/\\]/.test(command)) return true;
  if (command.endsWith("blekline-mcp-proxy") || command.endsWith("@blekline/mcp-proxy")) {
    return true;
  }

  return false;
}

/**
 * @param {import('./config.mjs').CursorHookConfig} config
 * @param {string} toolName
 * @param {Record<string, unknown>} toolArgs
 */
async function enforceViaCloud(config, toolName, toolArgs) {
  if (!config.workspaceToken) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.maskTimeoutMs);

  try {
    const res = await fetch(`${config.apiUrl.replace(/\/$/, "")}/api/mcp/enforce-tool-call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-blekline-workspace-token": config.workspaceToken,
        "x-blekline-client-surface": config.platform || "cursor",
      },
      body: JSON.stringify({
        toolName,
        arguments: toolArgs,
        platform: "Cursor-Hook",
        clientSurface: "cursor",
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {object} input
 * @param {import('./config.mjs').CursorHookConfig} config
 */
export async function runBeforeMcpExecutionHook(input, config) {
  if (!config.mcpGuard) {
    return { permission: "allow" };
  }

  if (isBleklineProxyServer(input)) {
    return { permission: "allow" };
  }

  const toolName = typeof input?.tool_name === "string" ? input.tool_name : "";
  const toolInput =
    input?.tool_input && typeof input.tool_input === "object" && !Array.isArray(input.tool_input)
      ? /** @type {Record<string, unknown>} */ (input.tool_input)
      : {};

  if (!toolName) {
    return { permission: "allow" };
  }

  const requestId = randomUUID();
  let result = enforceToolCallLocally({
    toolName,
    arguments: toolInput,
    requestId,
  });

  if (config.workspaceToken && config.mcpGuardMode === "auto") {
    const cloud = await enforceViaCloud(config, toolName, toolInput);
    if (cloud && typeof cloud.action === "string") {
      result = {
        ...result,
        action: cloud.action,
        entitiesMasked: typeof cloud.entitiesMasked === "number" ? cloud.entitiesMasked : result.entitiesMasked,
        riskTier: cloud.riskTier ?? result.riskTier,
        findings: cloud.findings ?? result.findings,
      };
    } else if (config.failClosed || config.enterprisePreset) {
      return {
        permission: "deny",
        user_message: "Blekline could not verify MCP policy (cloud unavailable).",
        agent_message:
          "MCP tool call blocked — cloud policy check failed. Retry when online or route through blekline-proxy.",
      };
    }
  }

  emitGovernanceEvent(config, {
    kind: "cursor_mcp_governance",
    action: result.action,
    entitiesMasked: result.entitiesMasked,
    requestId: result.requestId,
    riskTier: result.riskTier,
  });

  if (result.action === "block") {
    return {
      permission: "deny",
      user_message: "Blekline blocked an MCP tool call by workspace policy.",
      agent_message:
        "MCP tool call blocked by Blekline policy. Remove secrets or route sensitive tools through blekline-proxy.",
    };
  }

  if (result.action === "mask" && result.entitiesMasked > 0) {
    return {
      permission: "deny",
      user_message: `Blekline blocked MCP tool "${toolName}" with ${result.entitiesMasked} sensitive entit${result.entitiesMasked === 1 ? "y" : "ies"}. Route via blekline-proxy.`,
      agent_message:
        "MCP tool call contains secrets. Use blekline-proxy for downstream MCP so arguments are masked before execution.",
    };
  }

  return { permission: "allow" };
}
