import { z } from "zod";
import { executionTierSchema, workflowNodeKindSchema } from "./execution-routing.js";

export const createCellRunRequestSchema = z.object({
  displayName: z.string().max(120).optional(),
  workflowId: z.string().min(1).max(120).optional(),
  executionTier: executionTierSchema.optional(),
  nodeKind: workflowNodeKindSchema.optional(),
  toolCall: z.boolean().optional(),
  clusterId: z.string().max(120).optional(),
  cellProfileId: z.string().max(120).optional(),
  region: z.string().max(64).optional(),
  modelId: z.string().max(120).optional(),
});

export type CreateCellRunRequest = z.infer<typeof createCellRunRequestSchema>;

/** Sensible defaults for a governed act run (matches console Run). */
export const defaultActCellRunRequest: CreateCellRunRequest = {
  executionTier: "act",
  toolCall: true,
};