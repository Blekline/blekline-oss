import { cloudflareRunner } from "./cloudflare.js";
import { daytonaRunner } from "./daytona.js";
import { e2bRunner } from "./e2b.js";
import { modalRunner } from "./modal.js";
import { vercelRunner } from "./vercel.js";
import type { SandboxProviderRunner } from "../shared.js";

export const PROVIDERS: Record<string, SandboxProviderRunner> = {
  daytona: daytonaRunner,
  modal: modalRunner,
  vercel: vercelRunner,
  cloudflare: cloudflareRunner,
  e2b: e2bRunner,
};

export function resolveProvider(id: string): SandboxProviderRunner {
  const runner = PROVIDERS[id];
  if (!runner) {
    throw new Error(
      `Unknown SANDBOX_PROVIDER "${id}". Choose: ${Object.keys(PROVIDERS).join(", ")}`
    );
  }
  return runner;
}
