import { z } from "zod";

export const executionTierSchema = z.enum(["infer", "decide", "act"]);
export type ExecutionTier = z.infer<typeof executionTierSchema>;

export const workflowNodeKindSchema = z.enum(["system_one", "llm", "tool", "unknown"]);
export type WorkflowNodeKind = z.infer<typeof workflowNodeKindSchema>;

export const workflowContextSchema = z.object({
  workflowId: z.string().min(1).max(120).optional(),
  runId: z.string().min(1).max(120).optional(),
  nodeId: z.string().min(1).max(120).optional(),
  nodeKind: workflowNodeKindSchema.optional(),
  executionTier: executionTierSchema.optional(),
});

export type WorkflowContext = z.infer<typeof workflowContextSchema>;

export const toolRiskClassSchema = z.enum(["read_only", "mutating", "external", "untrusted_code"]);
export type ToolRiskClass = z.infer<typeof toolRiskClassSchema>;

export type ClassifyExecutionTierInput = {
  explicitTier?: ExecutionTier;
  toolCall?: boolean;
  toolRiskClass?: ToolRiskClass;
  nodeKind?: WorkflowNodeKind;
  defaultTier?: ExecutionTier;
};

function riskRequiresAct(risk?: ToolRiskClass): boolean {
  if (!risk) return false;
  return risk !== "read_only";
}

/** Classify infer | decide | act for routing and cell spawn. */
export function classifyExecutionTier(input: ClassifyExecutionTierInput): ExecutionTier {
  if (input.explicitTier) return input.explicitTier;
  if (input.nodeKind === "system_one") return "decide";
  if (input.toolCall && input.toolRiskClass) {
    return riskRequiresAct(input.toolRiskClass) ? "act" : input.defaultTier ?? "infer";
  }
  if (input.toolCall && !input.toolRiskClass) return "act";
  return input.defaultTier ?? "infer";
}

export function actSlotLabel(tier: ExecutionTier): string | null {
  return tier === "act" ? "Runs in act slot" : null;
}

export function mergeWorkflowContext(
  base: WorkflowContext | undefined,
  patch: WorkflowContext | undefined
): WorkflowContext | undefined {
  if (!base && !patch) return undefined;
  return { ...base, ...patch };
}

export function actTierRequiresCell(tier: ExecutionTier): boolean {
  return tier === "act";
}