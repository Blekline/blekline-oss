import { BleklineClient } from "@blekline/client";

const token = process.env.BLEKLINE_WORKSPACE_TOKEN?.trim();
if (!token) {
  console.error("Set BLEKLINE_WORKSPACE_TOKEN=blw_...");
  process.exit(1);
}

const client = new BleklineClient({
  baseUrl: process.env.BLEKLINE_API_URL?.trim() ?? "https://app.blekline.com",
  workspaceToken: token,
  metadata: { clientSurface: "sdk", platform: "mistral" },
});

const sample = process.argv[2] ?? "Contact alice@corp.com before calling Mistral.";
try {
  const masked = await client.mask({
    input: sample,
    platform: "mistral",
  });
  console.log("masked prompt:", masked.output ?? masked);
  if (!process.env.MISTRAL_API_KEY?.trim()) {
    console.log(
      "BYOK: set MISTRAL_API_KEY and call https://api.mistral.ai/v1 with the masked text (your account).",
    );
    console.log("Docs: https://app.blekline.com/docs/integrations/mistral-stack");
    process.exit(0);
  }
  console.log("Upstream Mistral call is BYOK — not executed in this OSS example.");
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}