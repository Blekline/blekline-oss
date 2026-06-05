import { BleklineClient } from "@blekline/client";
import type { ClientSurface } from "@blekline/contracts";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

export function envClientSurface(): ClientSurface {
  const v = process.env.BLEKLINE_CLIENT_SURFACE?.trim();
  if (v === "cursor" || v === "claude-desktop" || v === "codex") return v;
  return "sdk";
}

export function createClient(): BleklineClient {
  const token = process.env.BLEKLINE_WORKSPACE_TOKEN?.trim();
  if (!token) {
    throw new Error("BLEKLINE_WORKSPACE_TOKEN is required");
  }
  return new BleklineClient({
    baseUrl: process.env.BLEKLINE_API_URL?.trim(),
    workspaceToken: token,
    workspaceId: process.env.BLEKLINE_WORKSPACE_ID?.trim(),
    metadata: { clientSurface: envClientSurface() },
  });
}

export function createBleklineMcpServer(): Server {
  const server = new Server(
    { name: "blekline-mcp-server", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "blekline_mask_prompt",
        description:
          "Mask PII and secrets in a prompt via Blekline control plane before sending to an LLM. Call this before any outbound prompt containing sensitive data.",
        inputSchema: {
          type: "object",
          properties: {
            text: { type: "string", description: "Prompt text to mask" },
            platform: { type: "string", description: "Optional platform label (e.g. Cursor, Claude Desktop)" },
          },
          required: ["text"],
        },
      },
      {
        name: "blekline_classify_risk",
        description: "Simulate Blekline redaction policy on a prompt without masking.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: { type: "string" },
            platform: { type: "string" },
            sourceHost: { type: "string" },
          },
          required: ["prompt"],
        },
      },
      {
        name: "blekline_emit_event",
        description: "Emit metadata-only governance event to Blekline control plane.",
        inputSchema: {
          type: "object",
          properties: {
            kind: { type: "string" },
            platform: { type: "string" },
            entitiesMasked: { type: "number" },
            riskTier: { type: "string", enum: ["low", "medium", "high"] },
            action: { type: "string" },
          },
          required: ["kind"],
        },
      },
      {
        name: "blekline_evaluate_tool_call",
        description: "Evaluate MCP tool call arguments against Blekline workspace MCP tool policy (allow/mask/block).",
        inputSchema: {
          type: "object",
          properties: {
            toolName: { type: "string" },
            arguments: { type: "object" },
            platform: { type: "string" },
          },
          required: ["toolName", "arguments"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const client = createClient();
    const name = request.params.name;
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;

    if (name === "blekline_mask_prompt") {
      const text = String(args.text ?? "");
      const platform = args.platform ? String(args.platform) : "MCP";
      const result = await client.mask({ text, platform });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                maskedText: result.maskedText,
                entitiesMasked: result.entitiesMasked,
                decision: result.decision,
                provider: result.provider,
                requestId: result.requestId,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === "blekline_classify_risk") {
      const prompt = String(args.prompt ?? "");
      const result = await client.simulatePolicy({
        prompt,
        platform: args.platform ? String(args.platform) : undefined,
        sourceHost: args.sourceHost ? String(args.sourceHost) : undefined,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result.simulation, null, 2) }],
      };
    }

    if (name === "blekline_emit_event") {
      await client.emitEvent({
        kind: String(args.kind ?? "mcp_event"),
        platform: args.platform ? String(args.platform) : "MCP",
        entitiesMasked: typeof args.entitiesMasked === "number" ? args.entitiesMasked : 0,
        riskTier:
          args.riskTier === "low" || args.riskTier === "medium" || args.riskTier === "high"
            ? args.riskTier
            : undefined,
        action: args.action ? String(args.action) : undefined,
        clientSurface: envClientSurface(),
      });
      return { content: [{ type: "text", text: JSON.stringify({ ok: true }) }] };
    }

    if (name === "blekline_evaluate_tool_call") {
      const toolName = String(args.toolName ?? "");
      const toolArgs =
        args.arguments && typeof args.arguments === "object"
          ? (args.arguments as Record<string, unknown>)
          : {};
      const result = await client.enforceToolCall({
        toolName,
        arguments: toolArgs,
        platform: args.platform ? String(args.platform) : "MCP",
        clientSurface: envClientSurface(),
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  return server;
}
