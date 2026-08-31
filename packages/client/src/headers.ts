import { randomUUID } from "node:crypto";
import { BLEKLINE_HEADERS, type ClientSurface, type ModelProvider } from "@blekline/contracts";

function newRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return randomUUID();
}

export type ClientMetadata = {
  clientSurface?: ClientSurface;
  modelProvider?: ModelProvider;
  modelId?: string;
};

export function buildHeaders(input: {
  workspaceToken: string;
  workspaceId?: string;
  bearer?: string;
  requestId?: string;
  metadata?: ClientMetadata;
}): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    [BLEKLINE_HEADERS.requestId]: input.requestId ?? newRequestId(),
    [BLEKLINE_HEADERS.workspaceToken]: input.workspaceToken,
  };
  if (input.bearer) headers.Authorization = `Bearer ${input.bearer}`;
  if (input.workspaceId) headers[BLEKLINE_HEADERS.workspaceId] = input.workspaceId;
  if (input.metadata?.clientSurface) {
    headers[BLEKLINE_HEADERS.clientSurface] = input.metadata.clientSurface;
  }
  if (input.metadata?.modelProvider) {
    headers[BLEKLINE_HEADERS.modelProvider] = input.metadata.modelProvider;
  }
  if (input.metadata?.modelId) {
    headers[BLEKLINE_HEADERS.modelId] = input.metadata.modelId;
  }
  return headers;
}

export const DEFAULT_BASE_URLS = ["https://app.blekline.com"];
