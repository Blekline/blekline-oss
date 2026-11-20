import { z } from "zod";

/** Typed handoff from Discover (threat / APS) into execution policy compile. */
export const threatSignalPatchSchema = z.object({
  capabilityIds: z.array(z.string().min(1)).max(64),
  mcpToolPolicyDelta: z.record(z.string(), z.unknown()).optional(),
  toolArgPolicyDelta: z.record(z.string(), z.unknown()).optional(),
  threatRef: z.string().max(200).optional(),
  suggestionId: z.string().max(120).optional(),
});

export type ThreatSignalPatch = z.infer<typeof threatSignalPatchSchema>;
