import { CLIENT_SURFACE, MASK_PLATFORM, getApiUrl } from "./config";

export type MaskOk = {
  ok: true;
  maskedText: string;
  entitiesMasked: number;
  requestId?: string;
  blocked: boolean;
  blockReason?: string;
  decision?: string;
};

export type MaskErr = {
  ok: false;
  code: string;
  message: string;
  upgradeUrl?: string;
};

export type MaskResult = MaskOk | MaskErr;

type MaskApiBody = {
  maskedText?: string;
  entitiesMasked?: number;
  requestId?: string;
  blocked?: boolean;
  blockReason?: string;
  decision?: string;
  error?: string;
  code?: string;
  message?: string;
  upgradeUrl?: string;
};

const UNAUTHORIZED = "Invalid or expired workspace credentials. Reconnect Blekline.";
const BILLING = "This workspace’s plan doesn’t allow this operation.";

export async function maskPrompt(text: string, workspaceToken: string): Promise<MaskResult> {
  if (!workspaceToken) {
    return { ok: false, code: "unauthorized", message: UNAUTHORIZED };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch(`${getApiUrl()}/api/mask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-blekline-workspace-token": workspaceToken,
        "x-blekline-client-surface": CLIENT_SURFACE,
        "x-request-id": crypto.randomUUID(),
      },
      body: JSON.stringify({ text, platform: MASK_PLATFORM }),
      signal: controller.signal,
    });

    const body = (await res.json().catch(() => ({}))) as MaskApiBody;

    if (res.status === 401) {
      return { ok: false, code: "unauthorized", message: UNAUTHORIZED };
    }
    if (res.status === 403) {
      const upgradeUrl =
        typeof body.upgradeUrl === "string" ? body.upgradeUrl : `${getApiUrl()}/admin/settings/billing`;
      const message = typeof body.message === "string" ? body.message : typeof body.error === "string" ? body.error : BILLING;
      return {
        ok: false,
        code: typeof body.code === "string" ? body.code : "plan_limit",
        message,
        upgradeUrl,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        code: typeof body.code === "string" ? body.code : `http_${res.status}`,
        message: typeof body.error === "string" ? body.error : `Mask API HTTP ${res.status}`,
      };
    }

    const maskedText = String(body.maskedText ?? text);
    const blocked = body.blocked === true || body.decision === "block_and_review";
    return {
      ok: true,
      maskedText,
      entitiesMasked: typeof body.entitiesMasked === "number" ? body.entitiesMasked : 0,
      requestId: typeof body.requestId === "string" ? body.requestId : undefined,
      blocked,
      blockReason: typeof body.blockReason === "string" ? body.blockReason : undefined,
      decision: typeof body.decision === "string" ? body.decision : undefined,
    };
  } catch (err) {
    const code = err instanceof Error && err.name === "AbortError" ? "timeout" : "network_error";
    return { ok: false, code, message: "Couldn’t reach Blekline" };
  } finally {
    clearTimeout(timer);
  }
}
