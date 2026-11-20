import { z } from "zod";

export const filterModeSchema = z.enum(["all", "specific", "all_except", "none"]);

export const guardApplicabilityWhoSchema = z.object({
  aiAgents: filterModeSchema.default("all"),
  aiAgentIds: z.array(z.string().max(64)).max(64).optional(),
  backgroundAgents: filterModeSchema.default("all"),
  backgroundAgentIds: z.array(z.string().max(64)).max(64).optional(),
  groups: filterModeSchema.default("all"),
  groupIds: z.array(z.string().max(120)).max(128).optional(),
  userRiskScore: z.enum(["any", "range"]).default("any"),
  userRiskMin: z.number().min(0).max(100).optional(),
  userRiskMax: z.number().min(0).max(100).optional(),
});

export const guardApplicabilityWhatSchema = z.object({
  toolCalls: filterModeSchema.default("all"),
  integrationIds: z.array(z.string().max(64)).max(128).optional(),
  toolCallDirection: z.enum(["input", "output", "both"]).default("both"),
  prompts: z.enum(["all", "none"]).default("all"),
});

export const guardApplicabilitySchema = z.object({
  who: guardApplicabilityWhoSchema.optional(),
  what: guardApplicabilityWhatSchema.optional(),
});

export type GuardApplicabilityWire = z.infer<typeof guardApplicabilitySchema>;

export const customCheckEvaluatorSchema = z.enum(["built_in", "regex", "jsonata", "llm"]);

export type CustomCheckEvaluatorWire = z.infer<typeof customCheckEvaluatorSchema>;

export const stagedGuardSetPatchSchema = z.object({
  guardSetId: z.string().min(4).max(64),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  checks: z
    .array(
      z.object({
        capabilityId: z.string().min(2).max(120),
        enabled: z.boolean(),
        scope: z.enum(["runtime", "build", "both"]),
        action: z.enum(["redact", "block", "audit", "allow", "hold"]),
        params: z.record(z.string().max(64), z.unknown()).optional(),
      })
    )
    .max(256)
    .optional(),
  applicability: guardApplicabilitySchema.optional(),
  mcpToolPolicy: z.record(z.string().max(64), z.unknown()).optional(),
  ingressNeverShareKeywords: z.array(z.string().min(1).max(80)).max(64).optional(),
});

export type StagedGuardSetPatchWire = z.infer<typeof stagedGuardSetPatchSchema>;

export const policyChangeSetSchema = z.object({
  id: z.string().min(4).max(64),
  baseCompileHash: z.string().max(64).nullable(),
  patches: z.array(stagedGuardSetPatchSchema).max(64),
  updatedAt: z.string(),
  updatedBy: z.string().max(120),
});

export type PolicyChangeSetWire = z.infer<typeof policyChangeSetSchema>;

export const guardApplicabilityEntrySchema = z.object({
  guardSetId: z.string().min(4).max(64),
  applicability: guardApplicabilitySchema,
});

export function defaultGuardApplicability(): GuardApplicabilityWire {
  return guardApplicabilitySchema.parse({
    who: guardApplicabilityWhoSchema.parse({}),
    what: guardApplicabilityWhatSchema.parse({}),
  });
}
