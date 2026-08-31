import { randomUUID } from "node:crypto";
import { BleklineClient } from "@blekline/client";
import {
  enforceToolCallLocally,
  parseClientSurfaceFromEnv,
  type ClientSurface,
  type FleetMode,
  type McpToolPolicy,
} from "@blekline/contracts";

export type ProxyEnforcementContext = {
  client: BleklineClient;
  clientSurface: ClientSurface;
  useCloudEnforcement: boolean;
  mcpToolPolicy?: McpToolPolicy;
  fleetMode?: FleetMode;
  failClosed: boolean;
};

export type InterceptResult =
  | { ok: true; action: "allow"; arguments: Record<string, unknown> }
  | { ok: true; action: "mask"; arguments: Record<string, unknown>; entitiesMasked: number }
  | { ok: false; action: "block"; message: string; findings: unknown[] };

function envClientSurface(): ClientSurface {
  return parseClientSurfaceFromEnv(process.env.BLEKLINE_CLIENT_SURFACE);
}

export function createProxyContext(options?: {
  mcpToolPolicy?: McpToolPolicy;
  fleetMode?: FleetMode;
}): ProxyEnforcementContext {
  const token = process.env.BLEKLINE_WORKSPACE_TOKEN?.trim();
  if (!token) throw new Error("BLEKLINE_WORKSPACE_TOKEN is required");
  const failClosed =
    process.env.BLEKLINE_PROXY_FAIL_CLOSED === "1" ||
    process.env.BLEKLINE_PROXY_FAIL_CLOSED === "true" ||
    process.env.BLEKLINE_CURSOR_ENTERPRISE_PRESET === "1";
  return {
    client: new BleklineClient({
      baseUrl: process.env.BLEKLINE_API_URL?.trim(),
      workspaceToken: token,
      workspaceId: process.env.BLEKLINE_WORKSPACE_ID?.trim(),
      metadata: { clientSurface: envClientSurface() },
    }),
    clientSurface: envClientSurface(),
    useCloudEnforcement: process.env.BLEKLINE_PROXY_LOCAL_ONLY !== "1",
    mcpToolPolicy: options?.mcpToolPolicy,
    fleetMode: options?.fleetMode,
    failClosed,
  };
}

export async function interceptToolCall(
  ctx: ProxyEnforcementContext,
  toolName: string,
  toolArgs: Record<string, unknown>
): Promise<InterceptResult> {
  const requestId = randomUUID();
  let result = enforceToolCallLocally({
    toolName,
    arguments: toolArgs,
    requestId,
    mcpToolPolicy: ctx.mcpToolPolicy,
    fleetMode: ctx.fleetMode,
  });

  if (ctx.useCloudEnforcement) {
    try {
      result = await ctx.client.enforceToolCall({
        toolName,
        arguments: toolArgs,
        platform: "MCP-Proxy",
        clientSurface: ctx.clientSurface,
      });
    } catch {
      if (ctx.failClosed) {
        return {
          ok: false,
          action: "block",
          message: "Cloud enforcement unavailable (fail-closed)",
          findings: result.findings,
        };
      }
    }
  }

  void ctx.client
    .emitEvent({
      kind: "tool_call_enforcement",
      platform: "MCP-Proxy",
      entitiesMasked: result.entitiesMasked,
      riskTier: result.riskTier,
      action: result.action,
      mcpToolName: toolName,
      downstreamServer:
        process.env.BLEKLINE_MCP_PROXY_MOCK === "1"
          ? "mock"
          : (process.env.BLEKLINE_DOWNSTREAM_SERVER?.trim() || "unknown"),
      clientSurface: ctx.clientSurface,
    })
    .catch(() => {});

  if (result.action === "block") {
    return {
      ok: false,
      action: "block",
      message: "Blekline policy: block",
      findings: result.findings,
    };
  }

  if (result.action === "mask") {
    return {
      ok: true,
      action: "mask",
      arguments: result.maskedArguments,
      entitiesMasked: result.entitiesMasked,
    };
  }

  return { ok: true, action: "allow", arguments: toolArgs };
}
