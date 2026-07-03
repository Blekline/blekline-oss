import { randomUUID } from "node:crypto";
import { enforceToolCallLocally } from "@blekline/contracts";
import { emitGovernanceEvent } from "./emit-governance.mjs";

/**
 * @param {object} input
 * @returns {boolean}
 */
function isBleklineProxyServer(input) {
  const command = typeof input?.command === "string" ? input.command : "";
  const url = typeof input?.url === "string" ? input.url : "";
  const blob = `${command} ${url}`.toLowerCase();
  return blob.includes("blekline-proxy") || blob.includes("mcp-proxy");
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
    const needsCloud =
      result.action === "block" || result.action === "mask" || result.entitiesMasked > 0;
    if (needsCloud) {
      const cloud = await enforceViaCloud(config, toolName, toolInput);
      if (cloud && typeof cloud.action === "string") {
        result = {
          ...result,
          action: cloud.action,
          entitiesMasked: typeof cloud.entitiesMasked === "number" ? cloud.entitiesMasked : result.entitiesMasked,
          riskTier: cloud.riskTier ?? result.riskTier,
          findings: cloud.findings ?? result.findings,
        };
      }
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
