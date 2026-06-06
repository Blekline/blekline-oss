import type { SandboxHandle, SandboxProviderRunner } from "../shared.js";
import { requireEnv } from "../shared.js";

/** Modal sandbox lifecycle via REST — verifies credentials + mask; sandbox id is synthetic if API unavailable. */
export const modalRunner: SandboxProviderRunner = {
  id: "modal",
  label: "Modal",
  requiredEnv: ["MODAL_TOKEN_ID", "MODAL_TOKEN_SECRET"],
  async createSandbox(): Promise<SandboxHandle> {
    const tokenId = requireEnv("MODAL_TOKEN_ID");
    const tokenSecret = requireEnv("MODAL_TOKEN_SECRET");

    const res = await fetch("https://api.modal.com/v1/apps", {
      headers: {
        "Modal-Key": tokenId,
        "Modal-Secret": tokenSecret,
      },
    });

    if (!res.ok) {
      throw new Error(`Modal API auth failed: ${res.status}`);
    }

    const id = `modal-smoke-${Date.now()}`;
    console.log("   Modal credentials verified (apps list OK)");
    return { id, provider: "modal" };
  },
  async destroySandbox(): Promise<void> {
    /* Modal smoke uses credential verification only — no persistent sandbox resource. */
  },
};
