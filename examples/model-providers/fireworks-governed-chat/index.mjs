import { BleklineClient } from "@blekline/client";

const token = process.env.BLEKLINE_WORKSPACE_TOKEN?.trim();
if (!token) {
  console.error("Set BLEKLINE_WORKSPACE_TOKEN=blw_...");
  process.exit(1);
}

const client = new BleklineClient({
  baseUrl: process.env.BLEKLINE_API_URL?.trim() ?? "https://app.blekline.com",
  workspaceToken: token,
  metadata: { clientSurface: "sdk", platform: "fireworks" },
});

const sample = process.argv[2] ?? "API key blw_replace_with_workspace_token in prompt.";
try {
  const masked = await client.mask({
    input: sample,
    platform: "fireworks",
  });
  console.log("masked prompt:", masked.output ?? masked);
  if (!process.env.FIREWORKS_API_KEY?.trim()) {
    console.log(
      "BYOK: set FIREWORKS_API_KEY and call Fireworks inference with the masked text (your account).",
    );
    console.log("Docs: https://app.blekline.com/docs/integrations/fireworks-stack");
    process.exit(0);
  }
  console.log("Upstream Fireworks call is BYOK — not executed in this OSS example.");
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}