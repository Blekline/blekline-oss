import type { BleklineClient } from "@blekline/client";
import type { ClientSurface } from "@blekline/contracts";
import { BLEKLINE_MCP_TOOLS, resolveToolName } from "./registry.js";
import { formatToolError, toolErrorResult, toolTextResult } from "./errors.js";
import { handleThreatSearch, handleArenaLookup } from "./public-intel.js";

export type ToolHandlerContext = {
  client: BleklineClient;
  clientSurface: ClientSurface;
};

export async function executeBleklineMcpTool(
  rawName: string,
  args: Record<string, unknown>,
  ctx: ToolHandlerContext
) {
  const name = resolveToolName(rawName);

  try {
    if (name === BLEKLINE_MCP_TOOLS.maskPrompt) {
      const text = String(args.text ?? "");
      const platform = args.platform ? String(args.platform) : "MCP";
      const result = await ctx.client.mask({ text, platform });
      return toolTextResult({
        ok: true,
        maskedText: result.maskedText,
        entitiesMasked: result.entitiesMasked,
        decision: result.decision,
        provider: result.provider,
        requestId: result.requestId,
      });
    }

    if (name === BLEKLINE_MCP_TOOLS.simulatePolicy) {
      const prompt = String(args.prompt ?? "");
      const result = await ctx.client.simulatePolicy({
        prompt,
        platform: args.platform ? String(args.platform) : undefined,
        sourceHost: args.sourceHost ? String(args.sourceHost) : undefined,
      });
      return toolTextResult({ ok: true, simulation: result.simulation });
    }

    if (name === BLEKLINE_MCP_TOOLS.logGovernanceEvent) {
      await ctx.client.emitEvent({
        kind: String(args.kind ?? "mcp_event"),
        platform: args.platform ? String(args.platform) : "MCP",
        entitiesMasked: typeof args.entitiesMasked === "number" ? args.entitiesMasked : 0,
        riskTier:
          args.riskTier === "low" || args.riskTier === "medium" || args.riskTier === "high"
            ? args.riskTier
            : undefined,
        action: args.action ? String(args.action) : undefined,
        clientSurface: ctx.clientSurface,
      });
      return toolTextResult({ ok: true });
    }

    if (name === BLEKLINE_MCP_TOOLS.evaluateToolCall) {
      const toolName = String(args.toolName ?? "");
      const toolArgs =
        args.arguments && typeof args.arguments === "object"
          ? (args.arguments as Record<string, unknown>)
          : {};
      const result = await ctx.client.enforceToolCall({
        toolName,
        arguments: toolArgs,
        platform: args.platform ? String(args.platform) : "MCP",
        clientSurface: ctx.clientSurface,
      });
      return toolTextResult({ ok: true, ...result });
    }

    if (name === BLEKLINE_MCP_TOOLS.threatSearch) {
      const matches = await handleThreatSearch(args);
      return toolTextResult({ ok: true, matches, catalogUrl: "https://blekline.com/threats" });
    }

    if (name === BLEKLINE_MCP_TOOLS.arenaLookup) {
      const rows = await handleArenaLookup(args);
      return toolTextResult({ ok: true, rows, arenaUrl: "https://blekline.com/cyber-model-arena" });
    }

    return toolErrorResult({
      ok: false,
      code: "unknown_tool",
      message: `Unknown tool: ${rawName}`,
      retryable: false,
    });
  } catch (err) {
    return toolErrorResult(formatToolError(err));
  }
}
