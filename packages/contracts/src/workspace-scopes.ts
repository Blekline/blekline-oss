import { z } from "zod";

export const workspaceTokenScopeSchema = z.enum([
  "mask:write",
  "events:write",
  "events:read",
  "integrations:write",
  "runs:write",
  "runs:read",
]);

export type WorkspaceTokenScope = z.infer<typeof workspaceTokenScopeSchema>;

export const WORKSPACE_TOKEN_SCOPES = workspaceTokenScopeSchema.options;