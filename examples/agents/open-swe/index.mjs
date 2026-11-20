import { BleklineClient } from "@blekline/client";

const token = process.env.BLEKLINE_WORKSPACE_TOKEN?.trim();
const workflowId = process.env.BLEKLINE_WORKFLOW_ID?.trim();

if (!token) {
  console.error("Set BLEKLINE_WORKSPACE_TOKEN=blw_... (runs:write)");
  process.exit(1);
}
if (!workflowId?.startsWith("wf_")) {
  console.error("Set BLEKLINE_WORKFLOW_ID=wf_... for autonomous SWE workflows");
  process.exit(1);
}

const client = new BleklineClient({
  baseUrl: process.env.BLEKLINE_API_URL?.trim() ?? "https://app.blekline.com",
  workspaceToken: token,
  metadata: { clientSurface: "sdk", platform: "open-swe" },
});

try {
  const { run, requiresCell } = await client.createCellRun({
    workflowId,
    displayName: "Open SWE style act run (OSS example)",
    executionTier: "act",
    toolCall: true,
  });
  console.log("run:", run.id, run.status, "compileHash:", run.compileHash, "requiresCell:", requiresCell);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}