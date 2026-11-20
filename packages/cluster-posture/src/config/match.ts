/** Simple glob: * matches any substring. Case-insensitive. */
export function globMatch(pattern: string, value: string): boolean {
  const p = pattern.toLowerCase();
  const v = value.toLowerCase();
  if (!p.includes("*")) return p === v || v.includes(p);
  const parts = p.split("*").filter(Boolean);
  if (parts.length === 0) return true;
  let idx = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    const found = v.indexOf(part, idx);
    if (found === -1) return false;
    if (i === 0 && !p.startsWith("*") && found !== 0) return false;
    idx = found + part.length;
  }
  if (!p.endsWith("*") && idx !== v.length) {
    const last = parts[parts.length - 1]!;
    return v.endsWith(last);
  }
  return true;
}

export function anyGlobMatch(patterns: string[], value: string): boolean {
  return patterns.some((p) => globMatch(p, value));
}

export function matchesContainerName(patterns: string[], name: string): boolean {
  return anyGlobMatch(patterns, name);
}

export function matchesAnnotationKey(patterns: string[], key: string, value?: string): boolean {
  const combined = value !== undefined ? `${key}=${value}` : key;
  return patterns.some((p) => globMatch(p, key) || globMatch(p, combined));
}

export function matchesSecretName(patterns: string[], name: string): boolean {
  return anyGlobMatch(patterns, name);
}

export function matchesWebhookName(patterns: string[], name: string): boolean {
  return anyGlobMatch(patterns, name);
}

export function matchesNpName(patterns: string[], name: string): boolean {
  return anyGlobMatch(patterns, name);
}
