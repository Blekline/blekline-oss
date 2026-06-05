import type { MaskErrorCode } from "@blekline/contracts";

export class BleklineApiError extends Error {
  readonly status: number;
  readonly code?: MaskErrorCode | string;
  readonly requestId?: string;

  constructor(message: string, opts: { status: number; code?: string; requestId?: string }) {
    super(message);
    this.name = "BleklineApiError";
    this.status = opts.status;
    this.code = opts.code;
    this.requestId = opts.requestId;
  }
}

export async function parseJsonError(res: Response, requestId?: string): Promise<never> {
  let payload: { error?: string; code?: string; requestId?: string } = {};
  try {
    payload = (await res.json()) as typeof payload;
  } catch {
    /* ignore */
  }
  throw new BleklineApiError(payload.error ?? `HTTP ${res.status}`, {
    status: res.status,
    code: payload.code,
    requestId: payload.requestId ?? requestId ?? res.headers.get("x-request-id") ?? undefined,
  });
}
