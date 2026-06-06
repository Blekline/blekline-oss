import { z } from "zod";
import { CLIENT_SURFACES } from "./auth.js";

export type EnforcementAction = "allow" | "mask" | "block";

export const enforceToolCallRequestSchema = z.object({
  toolName: z.string().min(1).max(120),
  arguments: z.record(z.string(), z.unknown()),
  platform: z.string().max(40).optional(),
  clientSurface: z.enum(CLIENT_SURFACES).optional(),
});

export type EnforceToolCallRequest = z.infer<typeof enforceToolCallRequestSchema>;

export type ToolCallFinding = {
  id: string;
  label: string;
  field?: string;
};

export type EnforceToolCallResult = {
  action: EnforcementAction;
  maskedArguments: Record<string, unknown>;
  findings: ToolCallFinding[];
  entitiesMasked: number;
  riskTier: "low" | "medium" | "high";
  requestId: string;
};
