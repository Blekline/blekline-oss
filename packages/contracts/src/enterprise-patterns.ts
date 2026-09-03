/** Vendor-aligned secret shapes — keep in sync with webapp detector pack v1. */

export function reAwsAccessKeyId(): RegExp {
  return /\b(?:AKIA|ASIA|AIDA|AROA|AGPA|AIPA|ANPA|ANVA|APKA|ASCA|ACCA)[A-Z0-9]{16}\b/g;
}

export function reGithubClassicPat(): RegExp {
  return /\bgh[oprus]_[A-Za-z0-9_]{36,255}\b/g;
}

export function reGithubFineGrainedPat(): RegExp {
  return /\bgithub_pat_[A-Za-z0-9_]{80,500}\b/g;
}

export function reOpenAiSk(): RegExp {
  return /\bsk-(?!ant-)[A-Za-z0-9]{20,}\b/g;
}

export function reOpenAiSkProj(): RegExp {
  return /\bsk-proj-[A-Za-z0-9_-]{20,500}\b/g;
}

export function reJwtBlob(): RegExp {
  return /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
}

export function rePemPrivateKeyBlock(): RegExp {
  return /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----[\s\S]{0,12000}?-----END (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g;
}

export function reStripeSecretKey(): RegExp {
  return /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,128}\b/g;
}

export function reSlackToken(): RegExp {
  return /\bxox[baprs]-[A-Za-z0-9-]{10,128}\b/g;
}

export function reGoogleApiKey(): RegExp {
  return /\bAIza[0-9A-Za-z_-]{35}\b/g;
}

export function reIpv6(): RegExp {
  return /\b(?:[0-9A-Fa-f]{1,4}:){2,7}[0-9A-Fa-f]{1,4}\b/g;
}

export function reIntlPhone(): RegExp {
  return /\b\+[1-9]\d{7,14}\b/g;
}

/** Slovenian EMŠO (13 digits with checksum). */
export function reEmsoSi(): RegExp {
  return /\b\d{13}\b/g;
}

/** Croatian OIB (11 digits). */
export function reOibHr(): RegExp {
  return /\b\d{11}\b/g;
}

export function isValidEmsoChecksum(emso: string): boolean {
  if (!/^\d{13}$/.test(emso)) return false;
  const weights = [7, 6, 5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += Number(emso[i]) * weights[i]!;
  }
  let check = 11 - (sum % 11);
  if (check === 10 || check === 11) check = 0;
  return check === Number(emso[12]);
}

export function isValidOibChecksum(oib: string): boolean {
  if (!/^\d{11}$/.test(oib)) return false;
  let a = 10;
  for (let i = 0; i < 10; i += 1) {
    a = (a + Number(oib[i])) % 10;
    if (a === 0) a = 10;
    a = (a * 2) % 11;
  }
  const check = 11 - a === 10 ? 0 : 11 - a;
  return check === Number(oib[10]);
}
