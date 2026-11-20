import { BleklineClient } from "@blekline/client";
import { withBleklineToolGuard } from "@blekline/langchain";

const token = process.env.BLEKLINE_WORKSPACE_TOKEN?.trim();
if (!token) {
  console.error("Set BLEKLINE_WORKSPACE_TOKEN=blw_... (mask/enforce scopes)");
  process.exit(1);
}

const client = new BleklineClient({
  baseUrl: process.env.BLEKLINE_API_URL?.trim() ?? "https://app.blekline.com",
  workspaceToken: token,
  metadata: { clientSurface: "sdk", platform: "langchain" },
});

const sampleArgs = {
  query: process.argv[2] ?? "Find docs for alice@corp.com",
};

const searchDocs = withBleklineToolGuard(
  client,
  "search_docs",
  async (args) => ({ tool: "search_docs", args }),
  "langchain",
);

try {
  const result = await searchDocs(sampleArgs);
  console.log("tool result:", JSON.stringify(result));
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}