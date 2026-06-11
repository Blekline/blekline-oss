import { BleklineClient } from "@blekline/client";
import { parseClientSurfaceFromEnv, type ClientSurface } from "@blekline/contracts";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import {
  allKnownToolNames,
  executeBleklineMcpTool,
  listBleklineMcpToolsWithAliases,
} from "./tools/index.js";

export function envClientSurface(): ClientSurface {
  return parseClientSurfaceFromEnv(process.env.BLEKLINE_CLIENT_SURFACE);
}

export type CreateClientOptions = {
  workspaceToken?: string;
  baseUrl?: string;
  workspaceId?: string;
  clientSurface?: ClientSurface;
};

export function createClient(opts?: CreateClientOptions): BleklineClient {
  const token = opts?.workspaceToken?.trim() ?? process.env.BLEKLINE_WORKSPACE_TOKEN?.trim();
  if (!token) {
    throw new Error("BLEKLINE_WORKSPACE_TOKEN is required");
  }
  return new BleklineClient({
    baseUrl: opts?.baseUrl?.trim() ?? process.env.BLEKLINE_API_URL?.trim(),
    workspaceToken: token,
    workspaceId: opts?.workspaceId?.trim() ?? process.env.BLEKLINE_WORKSPACE_ID?.trim(),
    metadata: { clientSurface: opts?.clientSurface ?? envClientSurface() },
  });
}

export type BleklineMcpServerOptions = {
  createClient?: () => BleklineClient;
  clientSurface?: ClientSurface;
  includeDeprecatedAliases?: boolean;
};

export function createBleklineMcpServer(options?: BleklineMcpServerOptions): Server {
  const server = new Server(
    { name: "blekline-mcp-server", version: "0.4.0" },
    { capabilities: { tools: {} } }
  );

  const surface = options?.clientSurface ?? envClientSurface();
  const clientFactory = options?.createClient ?? (() => createClient({ clientSurface: surface }));

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = listBleklineMcpToolsWithAliases().map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      annotations: t.annotations,
    }));
    if (options?.includeDeprecatedAliases === false) {
      const canonical = new Set(allKnownToolNames());
      return {
        tools: tools.filter((t) => !t.description.startsWith("[Deprecated")),
      };
    }
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;
    return executeBleklineMcpTool(request.params.name, args, {
      client: clientFactory(),
      clientSurface: surface,
    });
  });

  return server;
}
