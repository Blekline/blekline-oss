import { applyDeterministicPiiMasks } from "./deterministic-pii-mask.js";
import { applyDiscoveryRegexMasks } from "./discovery-regex-mask.js";
import { findHighRiskLiteralsStillPresent, needsAuthoritativePii } from "./high-risk-miss.js";
import { applyNeverShareKeywords } from "./never-share-keyword-mask.js";
import { normalizeMaskInput } from "./normalize-mask-input.js";
import { scanTextForSecrets } from "./secret-patterns.js";

export type LocalMaskPipelineInput = {
  text: string;
  neverShareKeywords?: string[];
  keywordMode?: "substring" | "phrase";
  validateIbanChecksum?: boolean;
  validateFinanceRegional?: boolean;
  blockOnHighRiskMiss?: boolean;
};

export type LocalMaskPipelineResult = {
  maskedText: string;
  tokenMap: Record<string, string>;
  entitiesMasked: number;
  highRiskMiss: string[];
  secretFindings: number;
};

function mergeTokenMaps(into: Record<string, string>, from: Record<string, string>) {
  for (const [k, v] of Object.entries(from)) {
    into[k] = v;
  }
}

/** Shared local mask pipeline — hosted /api/mask pre-Azure, sidecar inline, hooks. */
export function runLocalMaskPipeline(input: LocalMaskPipelineInput): LocalMaskPipelineResult {
  const normalizedText = normalizeMaskInput(input.text);
  const ibanOpts = {
    validateIbanChecksum: input.validateIbanChecksum ?? false,
    validateFinanceRegional: input.validateFinanceRegional ?? true,
  };

  const neverShare = applyNeverShareKeywords(
    normalizedText,
    input.neverShareKeywords ?? [],
    input.keywordMode ?? "substring"
  );

  let working = neverShare.text;
  let entitiesMasked = neverShare.entitiesMasked;
  const tokenMap: Record<string, string> = {};

  const baselineDeterministic = applyDeterministicPiiMasks(working, ibanOpts);
  working = baselineDeterministic.maskedText;
  entitiesMasked += baselineDeterministic.entitiesMasked;
  mergeTokenMaps(tokenMap, baselineDeterministic.tokenMap);

  const discoveryMask = applyDiscoveryRegexMasks(working);
  working = discoveryMask.maskedText;
  entitiesMasked += discoveryMask.entitiesMasked;
  mergeTokenMaps(tokenMap, discoveryMask.tokenMap);

  const supplemental = applyDeterministicPiiMasks(working, ibanOpts);
  working = supplemental.maskedText;
  entitiesMasked += supplemental.entitiesMasked;
  mergeTokenMaps(tokenMap, supplemental.tokenMap);

  const secretFindings = scanTextForSecrets(normalizedText).length;
  const highRiskMiss =
    input.blockOnHighRiskMiss !== false
      ? findHighRiskLiteralsStillPresent(normalizedText, working)
      : [];

  return {
    maskedText: working,
    tokenMap,
    entitiesMasked,
    highRiskMiss,
    secretFindings,
  };
}

export function shouldSkipAzure(params: {
  mode: "azure_first" | "local_first" | "local_only";
  original: string;
  local: LocalMaskPipelineResult;
}): boolean {
  if (params.mode === "local_only") return true;
  if (params.mode === "azure_first") return false;
  if (params.local.highRiskMiss.length > 0) return false;
  return !needsAuthoritativePii(params.original, params.local.maskedText);
}

export { needsAuthoritativePii, findHighRiskLiteralsStillPresent };
