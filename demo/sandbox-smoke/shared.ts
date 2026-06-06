import { BleklineClient } from "@blekline/client";

export const BLEKLINE_API_URL =
  process.env.BLEKLINE_API_URL ?? "https://app.blekline.com";

export const TEST_TEXT =
  "Deploy for alice@corp.com using key AKIAIOSFODNN7EXAMPLE and db postgres://admin:s3cr3t@prod.db";

export const PII_PATTERNS = [
  /alice@corp\.com/,
  /AKIAIOSFODNN7EXAMPLE/,
  /s3cr3t/,
];

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function createBleklineClient(): BleklineClient {
  return new BleklineClient({
    baseUrl: BLEKLINE_API_URL,
    workspaceToken: requireEnv("BLEKLINE_WORKSPACE_TOKEN"),
    metadata: { clientSurface: "sdk" },
  });
}

export async function runBleklineMaskFromHost(
  client: BleklineClient,
  platform: string
): Promise<void> {
  console.log("2. Running Blekline mask call...");
  const result = await client.mask({
    text: TEST_TEXT,
    platform,
  });

  console.log(`   maskedText: ${result.maskedText}`);
  console.log(`   entitiesMasked: ${result.entitiesMasked}`);
  console.log(`   decision: ${result.decision}`);

  for (const pattern of PII_PATTERNS) {
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
}

export type SandboxHandle = {
  id: string;
  provider: string;
  meta?: unknown;
};

export type SandboxProviderRunner = {
  id: string;
  label: string;
  requiredEnv: string[];
  createSandbox: () => Promise<SandboxHandle>;
  destroySandbox: (handle: SandboxHandle) => Promise<void>;
};

export async function runProviderSmoke(runner: SandboxProviderRunner): Promise<void> {
  for (const name of runner.requiredEnv) {
    requireEnv(name);
  }
  requireEnv("BLEKLINE_WORKSPACE_TOKEN");

  const client = createBleklineClient();

  console.log(`\n=== ${runner.label} sandbox smoke ===\n`);
  console.log(`1. Creating ${runner.label} sandbox...`);
  const handle = await runner.createSandbox();
  console.log(`   Sandbox created: ${handle.id}`);

  try {
    await runBleklineMaskFromHost(client, `${runner.id}-smoke`);
  } finally {
    console.log(`4. Tearing down ${runner.label} sandbox...`);
    await runner.destroySandbox(handle);
    console.log("   Done.");
  }
}
