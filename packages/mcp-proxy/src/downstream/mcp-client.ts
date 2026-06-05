import { spawn } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export type DownstreamTool = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
};

/** Mock downstream tools for demo without Daytona API key. */
export const MOCK_DOWNSTREAM_TOOLS: DownstreamTool[] = [
  {
    name: "run_shell",
    description: "Run a shell command in sandbox (mock)",
    inputSchema: {
      type: "object",
      properties: { command: { type: "string" } },
      required: ["command"],
    },
  },
  {
    name: "write_file",
    description: "Write file in sandbox (mock)",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" }, content: { type: "string" } },
      required: ["path", "content"],
    },
  },
];

export async function listDownstreamTools(): Promise<DownstreamTool[]> {
  if (process.env.BLEKLINE_MCP_PROXY_MOCK === "1") {
    return MOCK_DOWNSTREAM_TOOLS;
  }

  const cmd = process.env.BLEKLINE_DOWNSTREAM_MCP_COMMAND?.trim();
  if (!cmd) return MOCK_DOWNSTREAM_TOOLS;

  const parts = cmd.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return MOCK_DOWNSTREAM_TOOLS;

  const [command, ...args] = parts;
  const transport = new StdioClientTransport({ command, args, env: process.env as Record<string, string> });
  const client = new Client({ name: "blekline-proxy-downstream", version: "0.1.0" }, { capabilities: {} });
  await client.connect(transport);
  const listed = await client.listTools();
  await client.close();
  return listed.tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema as Record<string, unknown>,
  }));
}

export async function callDownstreamTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  if (process.env.BLEKLINE_MCP_PROXY_MOCK === "1") {
    return { ok: true, mock: true, tool: name, received: args };
  }

  const cmd = process.env.BLEKLINE_DOWNSTREAM_MCP_COMMAND?.trim();
  if (!cmd) {
    return { ok: true, mock: true, tool: name, received: args };
  }

  const parts = cmd.split(",").map((s) => s.trim()).filter(Boolean);
  const [command, ...spawnArgs] = parts;
  const transport = new StdioClientTransport({
    command,
    args: spawnArgs,
    env: process.env as Record<string, string>,
  });
  const client = new Client({ name: "blekline-proxy-downstream", version: "0.1.0" }, { capabilities: {} });
  await client.connect(transport);
  const result = await client.callTool({ name, arguments: args });
  await client.close();
  return result;
}

/** Spawn helper for health checks (unused in hot path). */
export function spawnDownstreamCheck(): void {
  const cmd = process.env.BLEKLINE_DOWNSTREAM_MCP_COMMAND?.trim();
  if (!cmd) return;
  const parts = cmd.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return;
  spawn(parts[0], parts.slice(1), { stdio: "ignore" });
}
