import type { AuditConfig } from "../config/profile.js";
import type { DiscoverOptions } from "../discover/agents.js";
import type { ClusterSnapshot, Finding } from "../types.js";
import { runBleklineRules } from "./blekline.js";
import { applyAllowlist, dedupeFindings } from "./helpers.js";
import { runGenericRules } from "./generic.js";

export function runStaticRules(
  cluster: ClusterSnapshot,
  config: AuditConfig,
  discoverOpts: DiscoverOptions = {},
): {
  candidates: import("../types.js").AgentCandidate[];
  findings: Finding[];
  suppressedFindings: string[];
} {
  const { candidates, findings: genericFindings } = runGenericRules(cluster, config, discoverOpts);
  const blekFindings = runBleklineRules(cluster, config, candidates);
  const merged = dedupeFindings([...genericFindings, ...blekFindings]);
  const { findings, suppressed } = applyAllowlist(merged, config.allowlist.findings);
  return { candidates, findings, suppressedFindings: suppressed };
}
