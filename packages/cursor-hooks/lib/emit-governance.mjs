/**
 * Fire-and-forget metadata-only audit event (never includes prompt body).
 *
 * @param {import('./config.mjs').CursorHookConfig} config
 * @param {object} event
 */
export function emitGovernanceEvent(config, event) {
  if (!config.workspaceToken || !config.emitAuditEvents) return;

  const body = {
    kind: event.kind ?? "cursor_prompt_governance",
    platform: "Cursor-Hook",
    entitiesMasked: typeof event.entitiesMasked === "number" ? event.entitiesMasked : 0,
    action: event.action,
    clientSurface: config.platform || "cursor",
    riskTier: event.riskTier,
  };

  void fetch(`${config.apiUrl.replace(/\/$/, "")}/api/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-blekline-workspace-token": config.workspaceToken,
      "x-blekline-client-surface": config.platform || "cursor",
      ...(event.requestId ? { "x-request-id": event.requestId } : {}),
    },
    body: JSON.stringify(body),
  }).catch(() => {});
}
