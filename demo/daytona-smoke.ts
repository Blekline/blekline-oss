/**
 * Daytona integration smoke test
 *
 * Creates a Daytona sandbox, runs a Blekline mask call, asserts no raw PII
 * in the result, tears down the sandbox.
 *
 * Required env:
 *   DAYTONA_API_KEY
 *   BLEKLINE_WORKSPACE_TOKEN
 *   BLEKLINE_API_URL (default: https://app.blekline.com)
 */

import { BleklineClient } from "@blekline/client";

const BLEKLINE_API_URL =
  process.env.BLEKLINE_API_URL ?? "https://app.blekline.com";
const BLEKLINE_WORKSPACE_TOKEN = process.env.BLEKLINE_WORKSPACE_TOKEN ?? "";
const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY ?? "";

const TEST_TEXT =
  "Deploy for alice@corp.com using key AKIAIOSFODNN7EXAMPLE and db postgres://admin:s3cr3t@prod.db";

async function main() {
  if (!BLEKLINE_WORKSPACE_TOKEN) {
    throw new Error("BLEKLINE_WORKSPACE_TOKEN is required");
  }
  if (!DAYTONA_API_KEY) {
    throw new Error("DAYTONA_API_KEY is required");
  }

  const client = new BleklineClient({
    baseUrl: BLEKLINE_API_URL,
    workspaceToken: BLEKLINE_WORKSPACE_TOKEN,
    metadata: { clientSurface: "sdk" },
  });

  console.log("1. Creating Daytona sandbox...");
  const sandboxRes = await fetch("https://app.daytona.io/api/sandbox", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DAYTONA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ language: "typescript" }),
  });
  if (!sandboxRes.ok) {
    throw new Error(`Daytona sandbox create failed: ${sandboxRes.status}`);
  }
  const sandbox = (await sandboxRes.json()) as { id: string };
  console.log(`   Sandbox created: ${sandbox.id}`);

  try {
    console.log("2. Running Blekline mask call...");
    const result = await client.mask({
      text: TEST_TEXT,
      platform: "daytona-smoke",
    });

    console.log(`   maskedText: ${result.maskedText}`);
    console.log(`   entitiesMasked: ${result.entitiesMasked}`);
    console.log(`   decision: ${result.decision}`);

    const piiPatterns = [
      /alice@corp\.com/,
      /AKIAIOSFODNN7EXAMPLE/,
      /s3cr3t/,
    ];
    for (const pattern of piiPatterns) {
      if (pattern.test(result.maskedText)) {
        throw new Error(
          `FAIL: raw PII found in masked output — pattern ${pattern} matched`
        );
      }
    }

    if (result.entitiesMasked === 0) {
      throw new Error("FAIL: expected entities to be masked, got 0");
    }

    console.log("3. All assertions passed.");
  } finally {
    console.log("4. Tearing down Daytona sandbox...");
    await fetch(`https://app.daytona.io/api/sandbox/${sandbox.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${DAYTONA_API_KEY}` },
    });
    console.log("   Done.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
