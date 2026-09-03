import { compactIbanCandidate, isValidIbanChecksum } from "./iban-checksum.js";
import {
  isValidEmsoChecksum,
  isValidOibChecksum,
  reAwsAccessKeyId,
  reEmsoSi,
  reGithubClassicPat,
  reGithubFineGrainedPat,
  reGoogleApiKey,
  reIntlPhone,
  reIpv6,
  reJwtBlob,
  reOibHr,
  reOpenAiSk,
  reOpenAiSkProj,
  rePemPrivateKeyBlock,
  reSlackToken,
  reStripeSecretKey,
} from "./enterprise-patterns.js";

export type DeterministicMaskOptions = {
  validateIbanChecksum?: boolean;
  validateFinanceRegional?: boolean;
};

export type DeterministicMaskResult = {
  maskedText: string;
  tokenMap: Record<string, string>;
  entitiesMasked: number;
};

function nextToken(label: string, index: number): string {
  return `[${label}_${String(index).padStart(3, "0")}]`;
}

export function applyDeterministicPiiMasks(
  text: string,
  opts: DeterministicMaskOptions = {}
): DeterministicMaskResult {
  let maskedText = text;
  let tokenIndex = 1;
  const tokenMap: Record<string, string> = {};
  let entitiesMasked = 0;

  const replaceAll = (pattern: RegExp, label: string) => {
    maskedText = maskedText.replace(pattern, (match) => {
      if (match.includes("[") || match.includes("]")) return match;
      const token = nextToken(label, tokenIndex);
      tokenIndex += 1;
      tokenMap[token] = match;
      entitiesMasked += 1;
      return token;
    });
  };

  const IBAN_PATTERN = /\b[A-Z]{2}\d{2}(?:[ -]?[A-Z0-9]){11,30}\b/gi;
  if (opts.validateIbanChecksum) {
    maskedText = maskedText.replace(IBAN_PATTERN, (match) => {
      if (match.includes("[") || match.includes("]")) return match;
      if (!isValidIbanChecksum(compactIbanCandidate(match))) return match;
      const token = nextToken("INTERNATIONALBANKINGACCOUNTNUMBER", tokenIndex);
      tokenIndex += 1;
      tokenMap[token] = match;
      entitiesMasked += 1;
      return token;
    });
  } else {
    replaceAll(IBAN_PATTERN, "INTERNATIONALBANKINGACCOUNTNUMBER");
  }

  if (opts.validateFinanceRegional !== false) {
    maskedText = maskedText.replace(reEmsoSi(), (match) => {
      if (match.includes("[") || match.includes("]")) return match;
      if (!isValidEmsoChecksum(match)) return match;
      const token = nextToken("EMSO", tokenIndex);
      tokenIndex += 1;
      tokenMap[token] = match;
      entitiesMasked += 1;
      return token;
    });
    maskedText = maskedText.replace(reOibHr(), (match) => {
      if (match.includes("[") || match.includes("]")) return match;
      if (!isValidOibChecksum(match)) return match;
      const token = nextToken("OIB", tokenIndex);
      tokenIndex += 1;
      tokenMap[token] = match;
      entitiesMasked += 1;
      return token;
    });
  }

  replaceAll(/\b[A-Z]{4}[A-Z]{2}\d[A-Z0-9](?:[A-Z0-9]{3})?\b/g, "SWIFTCODE");
  replaceAll(
    /\b(?:api[_-]?key|client[_-]?secret|secret[_-]?key|auth[_-]?token|password)\s*[:=]\s*["']?[^\s"'<>]{4,256}["']?/gi,
    "CREDENTIAL"
  );
  replaceAll(/\b(?:API_KEY_SECRET|CLIENT_SECRET|SECRET_KEY)[_-][A-Z0-9]{4,}\b/gi, "CREDENTIAL");
  replaceAll(/\bblw_(?:live|eval|test)_[A-Za-z0-9_-]{8,}\b/gi, "WORKSPACETOKEN");
  replaceAll(/\bdb\.internal\.[a-z0-9.-]+\b/gi, "INTERNALHOST");

  replaceAll(rePemPrivateKeyBlock(), "PRIVATEKEYPEM");
  replaceAll(reStripeSecretKey(), "STRIPESECRET");
  replaceAll(reSlackToken(), "SLACKTOKEN");
  replaceAll(reGoogleApiKey(), "GOOGLEAPIKEY");
  replaceAll(reAwsAccessKeyId(), "AWSACCESSKEY");
  replaceAll(reGithubClassicPat(), "GITHUBTOKEN");
  replaceAll(reGithubFineGrainedPat(), "GITHUBTOKENFINE");
  replaceAll(reOpenAiSkProj(), "OPENAIAPIKEYPROJ");
  replaceAll(reOpenAiSk(), "OPENAIAPIKEY");
  replaceAll(reJwtBlob(), "JSONWEBTOKEN");
  replaceAll(reIpv6(), "IPV6ADDRESS");
  replaceAll(reIntlPhone(), "PHONEINTL");
  replaceAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "EMAIL");
  replaceAll(/\b\d{3}-\d{2}-\d{4}\b/g, "SSN");
  replaceAll(/\b(?:\d[ -]?){12,19}\b/g, "CARD");

  return { maskedText, tokenMap, entitiesMasked };
}
