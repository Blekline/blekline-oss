import { z } from "zod";
import {
  compiledGuardRuntimeSchema,
  executionPolicyInfrastructureSchema,
  EXECUTION_POLICY_SCHEMA_VERSION,
} from "./execution-policy.js";

export const POLICY_BUNDLE_FORMAT = "blekline-policy-bundle/v1" as const;

export const actPolicyBundleBodySchema = z.object({
  bundleSchema: z.literal(1),
  executionPolicySchemaVersion: z.literal(EXECUTION_POLICY_SCHEMA_VERSION),
  compileHash: z.string().min(8).max(128),
  compiledAt: z.string(),
  runtime: compiledGuardRuntimeSchema,
  infrastructure: executionPolicyInfrastructureSchema.optional(),
});

export type ActPolicyBundleBody = z.infer<typeof actPolicyBundleBodySchema>;

export function buildActPolicyBundleBody(input: {
  compileHash: string;
  compiledAt: string;
  runtime: z.infer<typeof compiledGuardRuntimeSchema>;
  infrastructure?: z.infer<typeof executionPolicyInfrastructureSchema>;
}): ActPolicyBundleBody {
  const body: ActPolicyBundleBody = {
    bundleSchema: 1,
    executionPolicySchemaVersion: EXECUTION_POLICY_SCHEMA_VERSION,
    compileHash: input.compileHash,
    compiledAt: input.compiledAt,
    runtime: {
      ...input.runtime,
      compileHash: input.compileHash,
    },
    infrastructure: input.infrastructure,
  };
  return actPolicyBundleBodySchema.parse(body);
}

export function assertPolicyBundleHash(body: ActPolicyBundleBody, expectedCompileHash: string): void {
  if (body.compileHash !== expectedCompileHash) {
    throw new Error("policy_bundle_hash_mismatch");
  }
}
