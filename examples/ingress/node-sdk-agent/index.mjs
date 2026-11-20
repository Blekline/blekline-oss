import { BleklineClient } from "@blekline/client";

const token = process.env.BLEKLINE_WORKSPACE_TOKEN?.trim();
if (!token) {
  console.error("Set BLEKLINE_WORKSPACE_TOKEN=blw_...");
  process.exit(1);
}

const client = new BleklineClient({
  baseUrl: process.env.BLEKLINE_API_URL?.trim() ?? "https://app.blekline.com",
  workspaceToken: token,
  metadata: { clientSurface: "sdk" },
});

const sample = "Contact jane@acme.com — key AKIAIOSFODNN7EXAMPLE";
const masked = await client.maskPrompt({ text: sample, platform: "node-sdk-example" });
console.log("masked:", masked.maskedText?.slice(0, 120) ?? masked);
