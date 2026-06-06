import type { SandboxHandle, SandboxProviderRunner } from "../shared.js";
import { requireEnv } from "../shared.js";

/** Verifies Cloudflare API token; full Container sandbox lifecycle requires account-specific setup. */
export const cloudflareRunner: SandboxProviderRunner = {
  id: "cloudflare",
  label: "Cloudflare",
  requiredEnv: ["CLOUDFLARE_API_TOKEN"],
  async createSandbox(): Promise<SandboxHandle> {
    const token = requireEnv("CLOUDFLARE_API_TOKEN");
    const res = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`Cloudflare token verify failed: ${res.status}`);
    }
    const payload = (await res.json()) as { success?: boolean };
    if (!payload.success) {
      throw new Error("Cloudflare token verify returned success=false");
    }
    const id = `cloudflare-smoke-${Date.now()}`;
    console.log("   Cloudflare API token verified");
    return { id, provider: "cloudflare" };
  },
  async destroySandbox(): Promise<void> {
    /* Credential verification only for CI smoke — see Cloudflare stack doc for Sandbox SDK wiring. */
  },
};
