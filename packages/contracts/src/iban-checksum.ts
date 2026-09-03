/** MOD-97 IBAN checksum (ISO 13616) for optional validation before masking. */

export function compactIbanCandidate(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

export function isValidIbanChecksum(iban: string): boolean {
  const compact = compactIbanCandidate(iban);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(compact)) return false;

  const rearranged = `${compact.slice(4)}${compact.slice(0, 4)}`;
  let numeric = "";
  for (let i = 0; i < rearranged.length; i += 1) {
    const ch = rearranged[i]!;
    if (ch >= "A" && ch <= "Z") {
      numeric += String(ch.charCodeAt(0) - 55);
    } else {
      numeric += ch;
    }
  }

  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 1) {
    remainder = (remainder * 10 + Number(numeric[i])) % 97;
  }
  return remainder === 1;
}
