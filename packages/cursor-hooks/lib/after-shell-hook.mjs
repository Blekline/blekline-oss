import { scanTextForSecrets } from "@blekline/contracts";
import { emitGovernanceEvent } from "./emit-governance.mjs";

/**
 * @param {object} input
 * @param {import('./config.mjs').CursorHookConfig} config
 */
export function runAfterShellExecutionHook(input, config) {
  if (!config.shellGuard || !config.emitAuditEvents) {
    return {};
  }

  const output = typeof input?.output === "string" ? input.output : "";
  const command = typeof input?.command === "string" ? input.command : "";
  if (!output.trim()) {
    return {};
  }

  const findings = scanTextForSecrets(output);
  if (findings.length === 0) {
    return {};
  }

  emitGovernanceEvent(config, {
    kind: "shell_output_signal",
    action: "signal_detected",
    entitiesMasked: findings.length,
    riskTier: findings.length >= 3 ? "medium" : "low",
  });

  return {};
}
