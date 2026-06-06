import type { SandboxHandle, SandboxProviderRunner } from "../shared.js";

export const daytonaRunner: SandboxProviderRunner = {
  id: "daytona",
  label: "Daytona",
  requiredEnv: ["DAYTONA_API_KEY"],
  async createSandbox(): Promise<SandboxHandle> {
    const apiKey = process.env.DAYTONA_API_KEY!.trim();
    const res = await fetch("https://app.daytona.io/api/sandbox", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ language: "typescript" }),
    });
    if (!res.ok) {
      throw new Error(`Daytona sandbox create failed: ${res.status}`);
    }
    const sandbox = (await res.json()) as { id: string };
    return { id: sandbox.id, provider: "daytona" };
  },
  async destroySandbox(handle: SandboxHandle): Promise<void> {
    const apiKey = process.env.DAYTONA_API_KEY!.trim();
    await fetch(`https://app.daytona.io/api/sandbox/${handle.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  },
};
