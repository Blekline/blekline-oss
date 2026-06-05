import { createServer, type ServerResponse } from "node:http";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createBleklineMcpServer } from "./server-core.js";

const transports = new Map<string, SSEServerTransport>();

export async function startSseServer(): Promise<void> {
  const port = Number(process.env.BLEKLINE_MCP_PORT ?? 3200);
  const host = process.env.BLEKLINE_MCP_HOST ?? "127.0.0.1";

  const httpServer = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "GET" && url.pathname === "/sse") {
      const transport = new SSEServerTransport("/message", res);
      transports.set(transport.sessionId, transport);
      transport.onclose = () => transports.delete(transport.sessionId);
      const server = createBleklineMcpServer();
      await server.connect(transport);
      await transport.start();
      return;
    }

    if (req.method === "POST" && url.pathname === "/message") {
      const sessionId = url.searchParams.get("sessionId");
      const transport = sessionId ? transports.get(sessionId) : undefined;
      if (!transport) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unknown MCP session" }));
        return;
      }
      await transport.handlePostMessage(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/health") {
      json(res, 200, { ok: true, transport: "sse", sessions: transports.size });
      return;
    }

    json(res, 404, { error: "Use GET /sse or POST /message?sessionId=..." });
  });

  await new Promise<void>((resolve) => httpServer.listen(port, host, resolve));
  console.error(`[blekline-mcp-server] SSE listening on http://${host}:${port}/sse`);
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}
