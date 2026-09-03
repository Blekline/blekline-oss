import { randomUUID } from "node:crypto";
import { runLocalMaskPipeline } from "@blekline/contracts";

/**
 * Instant in-process mask via shared @blekline/contracts pipeline. No network.
 *
 * @param {string} text
 * @param {{ validateIbanChecksum?: boolean, blockOnHighRiskMiss?: boolean }} [opts]
 * @returns {{ maskedText: string, entitiesMasked: number, blocked?: boolean, blockReason?: string }}
 */
export function maskPromptLocally(text, opts = {}) {
  const result = runLocalMaskPipeline({
    text,
    validateIbanChecksum: opts.validateIbanChecksum ?? false,
    validateFinanceRegional: true,
    blockOnHighRiskMiss: opts.blockOnHighRiskMiss ?? false,
  });
  if (opts.blockOnHighRiskMiss && result.highRiskMiss.length > 0) {
    return {
      maskedText: result.maskedText,
      entitiesMasked: result.entitiesMasked,
      blocked: true,
      blockReason: "high_risk_literal_remaining",
    };
  }
  return { maskedText: result.maskedText, entitiesMasked: result.entitiesMasked };
}

/**
 * @returns {string}
 */
export function localMaskRequestId() {
  return `local-${randomUUID().slice(0, 8)}`;
}
