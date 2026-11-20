import { BleklineClient } from "@blekline/client";

const token = process.env.BLEKLINE_WORKSPACE_TOKEN?.trim();
if (!token) {
  console.error("Set BLEKLINE_WORKSPACE_TOKEN=blw_...");
  process.exit(1);
}

const client = new BleklineClient({
  baseUrl: process.env.BLEKLINE_API_URL?.trim() ?? "https://app.blekline.com",
  workspaceToken: token,
  metadata: { clientSurface: "sdk", platform: "vercel-ai" },
});

/** Same boundary you would use before `generateText` / tool routes in Vercel AI SDK. */
async function runGuardedTool(toolName, args) {
  const decision = await client.enforceToolCall({
    toolName,
    arguments: args,
    platform: "vercel-ai",
    clientSurface: "sdk",
  });
  if (decision.action === "block") {
    throw new Error(`Blekline blocked tool: ${toolName}`);
  }
  const finalArgs =
    decision.action === "mask" && decision.maskedArguments ? decision.maskedArguments : args;
  return { action: decision.action, args: finalArgs, entitiesMasked: decision.entitiesMasked };
}

const args = { input: process.argv[2] ?? "Ship to bob@example.com" };

try {
  const gated = await runGuardedTool("vercel_tool_route", args);
  console.log("gated tool payload:", JSON.stringify(gated));
  console.log("Next: pass gated.args into your Vercel AI SDK tool handler (BYOK model keys).");
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}