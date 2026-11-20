import { BleklineClient } from "@blekline/client";

const token = process.env.BLEKLINE_WORKSPACE_TOKEN?.trim();
if (!token) {
  console.error("Set BLEKLINE_WORKSPACE_TOKEN=blw_...");
  process.exit(1);
}

const client = new BleklineClient({
  baseUrl: process.env.BLEKLINE_API_URL?.trim() ?? "https://app.blekline.com",
  workspaceToken: token,
  metadata: { clientSurface: "sdk", platform: "hermes" },
});

const toolName = process.argv[2] ?? "hermes_delegate";
const args = { task: process.argv[3] ?? "Review patch touching secrets blw_replace_with_workspace_token" };

try {
  const masked = await client.mask({ text: String(args.task), platform: "hermes" });
  const decision = await client.enforceToolCall({
    toolName,
    arguments: args,
    platform: "hermes",
    clientSurface: "sdk",
  });
  console.log("mask entities:", masked.entitiesMasked ?? 0);
  console.log("enforce:", decision.action, "entitiesMasked:", decision.entitiesMasked);
  console.log("Ingress path: use @blekline/mcp-proxy — see examples/ingress/proxy-downstream-mcp");
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}