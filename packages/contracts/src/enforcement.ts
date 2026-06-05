import { z } from "zod";

export type EnforcementAction = "allow" | "mask" | "block";

export const enforceToolCallRequestSchema = z.object({
  toolName: z.string().min(1).max(120),
  arguments: z.record(z.string(), z.unknown()),
  platform: z.string().max(40).optional(),
  clientSurface: z.enum(["cursor", "claude-desktop", "codex", "sdk", "extension", "unknown"]).optional(),
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
