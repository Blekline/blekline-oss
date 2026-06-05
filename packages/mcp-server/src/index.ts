import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createBleklineMcpServer } from "./server-core.js";
import { startSseServer } from "./sse-server.js";

async function main() {
  const mode = process.env.BLEKLINE_MCP_TRANSPORT?.trim().toLowerCase() ?? "stdio";
  if (mode === "sse") {
    await startSseServer();
    return;
  }

  const server = createBleklineMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("[blekline-mcp-server]", err);
  process.exit(1);
});
