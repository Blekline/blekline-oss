import { z } from "zod";

export const maskRequestSchema = z.object({
  text: z.string().min(1),
  platform: z.string().max(40).optional(),
});

export type MaskRequest = z.infer<typeof maskRequestSchema>;

export type WireRedactionAction = "mask_and_send" | "mask_and_confirm" | "block_and_review";

export type MaskResponse = {
  maskedText: string;
  tokenMap: Record<string, string>;
  entitiesMasked: number;
  platform: string;
  provider: "azure" | "fallback_local";
  requestId: string;
  piiLanguage?: string;
  decision?: WireRedactionAction;
  blocked?: boolean;
  blockReason?: string;
};

export type MaskErrorCode =
  | "billing_required"
  | "credits_exhausted"
  | "prompt_limit_exceeded"
  | "mask_fallback_blocked"
  | "high_risk_literal_remaining"
  | "plan_upgrade_required";
