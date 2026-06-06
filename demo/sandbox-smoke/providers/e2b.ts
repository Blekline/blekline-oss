import type { SandboxHandle, SandboxProviderRunner } from "../shared.js";

export const e2bRunner: SandboxProviderRunner = {
  id: "e2b",
  label: "E2B",
  requiredEnv: ["E2B_API_KEY"],
  async createSandbox(): Promise<SandboxHandle> {
    const apiKey = process.env.E2B_API_KEY!.trim();
    const res = await fetch("https://api.e2b.dev/sandboxes", {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`E2B sandbox create failed: ${res.status} ${body}`);
    }
    const sandbox = (await res.json()) as { sandboxID: string };
    return { id: sandbox.sandboxID, provider: "e2b" };
  },
  async destroySandbox(handle: SandboxHandle): Promise<void> {
    const apiKey = process.env.E2B_API_KEY!.trim();
    await fetch(`https://api.e2b.dev/sandboxes/${handle.id}`, {
      method: "DELETE",
      headers: { "X-API-Key": apiKey },
    });
  },
};
