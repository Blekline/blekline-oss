import type {
  EnforceToolCallRequest,
  EnforceToolCallResult,
  EventIngest,
  MaskRequest,
  MaskResponse,
  PolicySimulateRequest,
} from "@blekline/contracts";
import { buildHeaders, DEFAULT_BASE_URLS, type ClientMetadata } from "./headers.js";
import { BleklineApiError, parseJsonError } from "./errors.js";

export type BleklineClientOptions = {
  baseUrl?: string;
  baseUrls?: string[];
  workspaceToken: string;
  workspaceId?: string;
  bearer?: string;
  metadata?: ClientMetadata;
  fetchImpl?: typeof fetch;
};

export class BleklineClient {
  private readonly baseUrls: string[];
  private readonly workspaceToken: string;
  private readonly workspaceId?: string;
  private readonly bearer?: string;
  private readonly metadata?: ClientMetadata;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: BleklineClientOptions) {
    this.baseUrls = opts.baseUrls ?? (opts.baseUrl ? [opts.baseUrl] : DEFAULT_BASE_URLS);
    this.workspaceToken = opts.workspaceToken;
    this.workspaceId = opts.workspaceId;
    this.bearer = opts.bearer;
    this.metadata = opts.metadata;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const terminal = new Set([400, 401, 403, 404, 422, 429, 500, 502, 503, 504]);
    let lastError: unknown;

    for (const base of this.baseUrls) {
      const url = `${base.replace(/\/$/, "")}${path}`;
      try {
        const res = await this.fetchImpl(url, init);
        if (res.ok) return (await res.json()) as T;
        if (terminal.has(res.status)) {
          await parseJsonError(res);
        }
        lastError = new BleklineApiError(`HTTP ${res.status}`, { status: res.status });
      } catch (err) {
        lastError = err;
      }
    }

    if (lastError instanceof Error) throw lastError;
    throw new BleklineApiError("All base URLs failed", { status: 503 });
  }

  async mask(input: MaskRequest & { platform?: string }): Promise<MaskResponse> {
    const headers = buildHeaders({
      workspaceToken: this.workspaceToken,
      workspaceId: this.workspaceId,
      bearer: this.bearer,
      metadata: this.metadata,
    });
    return this.request<MaskResponse>("/api/mask", {
      method: "POST",
      headers,
      body: JSON.stringify({
        text: input.text,
        platform: input.platform ?? "SDK",
      }),
    });
  }

  async emitEvent(event: EventIngest): Promise<{ ok: true }> {
    const headers = buildHeaders({
      workspaceToken: this.workspaceToken,
      workspaceId: this.workspaceId,
      bearer: this.bearer,
      metadata: this.metadata,
    });
    return this.request<{ ok: true }>("/api/events", {
      method: "POST",
      headers,
      body: JSON.stringify(event),
    });
  }

  async simulatePolicy(input: PolicySimulateRequest): Promise<{
    ok: true;
    simulation: {
      platform: string;
      risk: "low" | "medium" | "high";
      action: string;
      matchedKeywords: string[];
      shieldEnabled: boolean;
    };
  }> {
    const headers = buildHeaders({
      workspaceToken: this.workspaceToken,
      workspaceId: this.workspaceId,
      bearer: this.bearer,
      metadata: this.metadata,
    });
    return this.request("/api/policy/simulate", {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });
  }

  async enforceToolCall(input: EnforceToolCallRequest): Promise<EnforceToolCallResult> {
    const headers = buildHeaders({
      workspaceToken: this.workspaceToken,
      workspaceId: this.workspaceId,
      bearer: this.bearer,
      metadata: this.metadata,
    });
    return this.request<EnforceToolCallResult>("/api/mcp/enforce-tool-call", {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });
  }
}
