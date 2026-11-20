import { z } from "zod";

/** Bump when compiled workspace execution policy shape changes. */
export const EXECUTION_POLICY_SCHEMA_VERSION = 3;

export const guardCheckActionSchema = z.enum(["redact", "block", "audit", "allow", "hold"]);

export const guardCheckScopeSchema = z.enum(["runtime", "build", "both"]);

export const compiledGuardCheckActionSchema = z.object({
  capabilityId: z.string().min(1).max(120),
  engineKey: z.string().min(1).max(120),
  kind: z.string().min(1).max(64),
  action: guardCheckActionSchema,
  scope: guardCheckScopeSchema,
});

export const mcpToolPolicySnapshotSchema = z.object({
  allowedTools: z.array(z.string()).optional(),
  deniedTools: z.array(z.string()).optional(),
  defaultAction: z.enum(["allow", "mask", "block"]).optional(),
  approvedDownstreamServers: z.array(z.unknown()).optional(),
});

export const compiledGuardRuntimeSchema = z.object({
  compiledAt: z.string(),
  compileHash: z.string(),
  enabledDetectorRuleIds: z.array(z.string()),
  enabledAzureCategories: z.array(z.string()),
  neverShareKeywords: z.array(z.string()),
  strictMode: z.boolean(),
  shieldEnabled: z.boolean(),
  promptRiskClassify: z.boolean(),
  maskBlockOnHighRiskMiss: z.boolean(),
  attachmentGuard: z.boolean(),
  mcpToolPolicy: mcpToolPolicySnapshotSchema,
  hookPolicyVersion: z.number().int().positive(),
  checkActions: z.array(compiledGuardCheckActionSchema),
  keywordPhrases: z.array(z.string()).optional(),
  customRegex: z
    .array(
      z.object({
        id: z.string(),
        pattern: z.string(),
        flags: z.string().optional(),
      })
    )
    .optional(),
});

export const compiledGuardBuildSchema = z.object({
  compiledAt: z.string(),
  enabledDetectorRuleIds: z.array(z.string()),
  enabledAzureCategories: z.array(z.string()),
  keywordPhrases: z.array(z.string()),
  customRegex: z.array(
    z.object({
      id: z.string(),
      pattern: z.string(),
      flags: z.string().optional(),
    })
  ),
  checkActions: z.array(compiledGuardCheckActionSchema),
});

export const executionPolicySessionSchema = z.object({
  blockDestructiveWhenContaminated: z.boolean().optional(),
  autoContaminateOnInjection: z.boolean().optional(),
});

export const executionPolicyInfrastructureSchema = z.object({
  mandatoryHopRequired: z.boolean().optional(),
  egressAllowlistEnabled: z.boolean().optional(),
  supplyChainBuildGate: z.boolean().optional(),
});

export const workspaceExecutionPolicySchema = z.object({
  schemaVersion: z.literal(EXECUTION_POLICY_SCHEMA_VERSION),
  version: z.number().int().nonnegative(),
  compiledAt: z.string(),
  compileHash: z.string(),
  runtime: compiledGuardRuntimeSchema,
  build: compiledGuardBuildSchema,
  session: executionPolicySessionSchema.optional(),
  infrastructure: executionPolicyInfrastructureSchema.optional(),
});

export type GuardCheckActionWire = z.infer<typeof guardCheckActionSchema>;
export type CompiledGuardCheckActionWire = z.infer<typeof compiledGuardCheckActionSchema>;
export type WorkspaceExecutionPolicyWire = z.infer<typeof workspaceExecutionPolicySchema>;

export function parseWorkspaceExecutionPolicy(
  raw: unknown
): WorkspaceExecutionPolicyWire | null {
  const parsed = workspaceExecutionPolicySchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
