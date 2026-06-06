import { z } from "zod";
import { CLIENT_SURFACES } from "./auth.js";

export const eventIngestSchema = z.object({
  platform: z.string().max(40).optional(),
  kind: z.string().max(48).optional(),
  entitiesMasked: z.number().int().min(0).max(5000).optional(),
  riskTier: z.enum(["low", "medium", "high"]).optional(),
  sourceHost: z.string().max(253).optional(),
  action: z.string().max(48).optional(),
  maskProvider: z.enum(["azure", "fallback_local"]).optional(),
  maskPhase: z.string().max(48).optional(),
  clientSurface: z.enum(CLIENT_SURFACES).optional(),
  modelProvider: z.enum(["anthropic", "openai", "google", "xai", "cursor", "unknown"]).optional(),
  modelId: z.string().max(80).optional(),
  mcpToolName: z.string().max(120).optional(),
  downstreamServer: z.string().max(80).optional(),
});

export type EventIngest = z.infer<typeof eventIngestSchema>;
