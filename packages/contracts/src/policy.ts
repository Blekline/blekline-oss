import type { WireRedactionAction } from "./mask.js";

export type PromptRiskTier = "low" | "medium" | "high";

export type PolicySimulation = {
  platform: string;
  risk: PromptRiskTier;
  action: WireRedactionAction;
  matchedKeywords: string[];
  shieldEnabled: boolean;
};

export type PolicySimulateRequest = {
  prompt: string;
  platform?: string;
  sourceHost?: string;
};
