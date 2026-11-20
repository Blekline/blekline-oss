import { BleklineClient } from "@blekline/client";

const token = process.env.BLEKLINE_WORKSPACE_TOKEN?.trim();
const workflowId = process.env.BLEKLINE_WORKFLOW_ID?.trim();

if (!token) {
  console.error("Set BLEKLINE_WORKSPACE_TOKEN=blw_... (runs:write scope)");
  process.exit(1);
}
if (!workflowId || !workflowId.startsWith("wf_")) {
  console.error("Set BLEKLINE_WORKFLOW_ID=wf_... (create a workflow in Console first)");
  process.exit(1);
}

const client = new BleklineClient({
  baseUrl: process.env.BLEKLINE_API_URL?.trim() ?? "https://app.blekline.com",
  workspaceToken: token,
  metadata: { clientSurface: "sdk" },
});

try {
  const policy = await client.getExecutionPolicy();
  if (!policy.policy?.compileHash) {
    console.warn("No published policy yet — publish in Console or see /docs/runtime-policy");
  }
  const { run, requiresCell } = await client.createCellRun({
    workflowId,
    displayName: "First act run (OSS example)",
    executionTier: "act",
    toolCall: true,
  });
  console.log("run:", run.id, "status:", run.status, "compileHash:", run.compileHash);
  console.log("requiresCell:", requiresCell);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("createCellRun failed:", msg);
  console.error("See https://app.blekline.com/docs/workflows-and-runs");
  process.exit(1);
}