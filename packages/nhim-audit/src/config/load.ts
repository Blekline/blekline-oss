import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import type { AuditConfig, AuditProfileName } from "./profile.js";
import { resolveAuditConfig } from "./profile.js";

export function loadConfigFile(path?: string): Partial<AuditConfig> | undefined {
  if (!path) return undefined;
  if (!existsSync(path)) {
    throw new Error(`Config file not found: ${path}`);
  }
  const raw = readFileSync(path, "utf8");
  try {
    return JSON.parse(raw) as Partial<AuditConfig>;
  } catch {
    throw new Error(`Config must be JSON (use nhim-audit.example.json): ${path}`);
  }
}

export function buildAuditConfig(opts: {
  profile?: AuditProfileName;
  configPath?: string;
  clusterAlias?: string;
  probeAllowNamespaces?: string[];
  labelSelector?: string;
}): AuditConfig {
  const fileConfig = loadConfigFile(opts.configPath);
  const profile =
    opts.profile ?? fileConfig?.profile ?? ("generic" as AuditProfileName);
  const config = resolveAuditConfig(profile, fileConfig);
  if (opts.clusterAlias) {
    config.output.clusterAlias = opts.clusterAlias;
  }
  if (opts.labelSelector) {
    config.discovery.labelSelector = opts.labelSelector;
  }
  if (opts.probeAllowNamespaces?.length) {
    config.probe.allowNamespaces = opts.probeAllowNamespaces;
  }
  return config;
}

export function configFingerprint(config: AuditConfig): string {
  return createHash("sha256").update(JSON.stringify(config)).digest("hex").slice(0, 16);
}
