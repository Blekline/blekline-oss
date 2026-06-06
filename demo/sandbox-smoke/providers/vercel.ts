import type { SandboxHandle, SandboxProviderRunner } from "../shared.js";

export const vercelRunner: SandboxProviderRunner = {
  id: "vercel",
  label: "Vercel Sandbox",
  requiredEnv: [],
  async createSandbox(): Promise<SandboxHandle> {
    const hasOidc =
      Boolean(process.env.VERCEL_OIDC_TOKEN?.trim()) ||
      Boolean(process.env.VERCEL_TOKEN?.trim());

    if (!hasOidc) {
      throw new Error(
        "VERCEL_OIDC_TOKEN or VERCEL_TOKEN is required for Vercel Sandbox smoke"
      );
    }

    try {
      const { Sandbox } = await import("@vercel/sandbox");
      const sandbox = await Sandbox.create({ runtime: "node22" });
      return {
        id: sandbox.sandboxId ?? `vercel-${Date.now()}`,
        provider: "vercel",
        meta: sandbox,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("Cannot find module")) {
        throw new Error(
          "Install @vercel/sandbox in the repo root to run Vercel Sandbox smoke: pnpm add -D @vercel/sandbox"
        );
      }
      throw err;
    }
  },
  async destroySandbox(handle: SandboxHandle): Promise<void> {
    const sandbox = handle.meta as { stop?: () => Promise<void> } | undefined;
    if (sandbox?.stop) {
      await sandbox.stop();
    }
  },
};
