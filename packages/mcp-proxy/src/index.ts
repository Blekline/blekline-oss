import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { callDownstreamTool, listDownstreamTools } from "./downstream/mcp-client.js";
import { assertDownstreamInRegistry, hashDownstreamCommand } from "./downstream/registry.js";
import { createProxyContext, interceptToolCall } from "./mcp-proxy.js";
import { normalizeMcpToolPolicy } from "@blekline/contracts";

const server = new Server(
  { name: "blekline-mcp-proxy", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

let ctx: ReturnType<typeof createProxyContext> | null = null;

function getCtx() {
  if (!ctx) ctx = createProxyContext();
  return ctx;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const downstream = await listDownstreamTools();
  return {
    tools: downstream.map((t) => ({
      name: t.name,
      description: t.description ?? `Proxied tool (Blekline governed): ${t.name}`,
      inputSchema: t.inputSchema ?? { type: "object", properties: {} },
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const toolArgs = (request.params.arguments ?? {}) as Record<string, unknown>;
  const enforcement = await interceptToolCall(getCtx(), toolName, toolArgs);

  if (!enforcement.ok) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: enforcement.message,
              action: enforcement.action,
              findings: enforcement.findings,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  const downstreamResult = await callDownstreamTool(toolName, enforcement.arguments);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            bleklineAction: enforcement.action,
            entitiesMasked: enforcement.action === "mask" ? enforcement.entitiesMasked : 0,
            result: downstreamResult,
          },
          null,
          2
        ),
      },
    ],
  };
});

async function main() {
  const downstreamCommand = process.env.BLEKLINE_DOWNSTREAM_COMMAND?.trim() || "node";
  const downstreamArgs = (process.env.BLEKLINE_DOWNSTREAM_ARGS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const commandHash = hashDownstreamCommand(downstreamCommand, downstreamArgs);
  const registryJson = process.env.BLEKLINE_MCP_REGISTRY_JSON?.trim();
  let registryPolicy = normalizeMcpToolPolicy(undefined);
  if (registryJson) {
    try {
      registryPolicy = normalizeMcpToolPolicy(JSON.parse(registryJson));
    } catch {
      throw new Error("Invalid BLEKLINE_MCP_REGISTRY_JSON");
    }
  }
  assertDownstreamInRegistry(
    registryPolicy,
    commandHash,
    process.env.BLEKLINE_DOWNSTREAM_SERVER_ID?.trim()
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("[blekline-mcp-proxy]", err);
  process.exit(1);
});
