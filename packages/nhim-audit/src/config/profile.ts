export type AuditProfileName = "generic" | "blekline";

export interface AuditConfig {
  profile: AuditProfileName;
  discovery: {
    labelSelector?: string;
    excludeNamespaces: string[];
    customSelector?: Record<string, string>;
  };
  enforcement: {
    sidecarContainerNames: string[];
    injectAnnotationKeys: string[];
    autoRouteDisabledKeys: string[];
    autoRouteIptablesKeys: string[];
    enforcementPorts: number[];
    authSecretNamePatterns: string[];
    llmEnvPrefixes: string[];
    sidecarPathEnvKeys: string[];
  };
  networkPolicy: {
    mandatoryHopNamePatterns: string[];
    wideEgressCidrs: string[];
  };
  admission: {
    enforcementWebhookNamePatterns: string[];
  };
  allowlist: {
    findings: string[];
  };
  output: {
    schemaVersion: "2.0";
    suppressVendorCta: boolean;
    clusterAlias?: string;
  };
  probe: {
    enforcePath: string;
    healthPath: string;
    allowNamespaces: string[];
  };
}

const GENERIC_DEFAULTS: AuditConfig = {
  profile: "generic",
  discovery: {
    excludeNamespaces: ["kube-system", "kube-public"],
  },
  enforcement: {
    sidecarContainerNames: [
      "envoy",
      "istio-proxy",
      "linkerd-proxy",
      "linkerd-init",
      "*-sidecar",
      "*-proxy",
    ],
    injectAnnotationKeys: ["*inject*", "*sidecar*"],
    autoRouteDisabledKeys: ["*auto-route*disabled*", "*auto-route=false*"],
    autoRouteIptablesKeys: ["*auto-route*iptables*"],
    enforcementPorts: [8787, 15001, 15006],
    authSecretNamePatterns: ["*-sidecar-auth", "*-enforce-auth", "*-sidecar-secret"],
    llmEnvPrefixes: ["OPENAI_", "ANTHROPIC_", "AZURE_OPENAI", "LANGCHAIN_", "MCP_"],
    sidecarPathEnvKeys: [
      "OPENAI_BASE_URL",
      "OPENAI_API_BASE",
      "ANTHROPIC_BASE_URL",
      "AZURE_OPENAI_ENDPOINT",
      "HTTP_PROXY",
      "HTTPS_PROXY",
    ],
  },
  networkPolicy: {
    mandatoryHopNamePatterns: ["mandatory-hop", "agent-egress", "enforcement-hop", "*-hop"],
    wideEgressCidrs: ["0.0.0.0/0", "::/0"],
  },
  admission: {
    enforcementWebhookNamePatterns: ["*inject*", "*sidecar*", "*mutate*"],
  },
  allowlist: {
    findings: [],
  },
  output: {
    schemaVersion: "2.0",
    suppressVendorCta: true,
  },
  probe: {
    enforcePath: "/v1/enforce-tool-call",
    healthPath: "/health",
    allowNamespaces: [],
  },
};

const BLEKLINE_OVERRIDES: Partial<AuditConfig> = {
  profile: "blekline",
  enforcement: {
    sidecarContainerNames: ["blekline-sidecar", "envoy", "istio-proxy", "linkerd-proxy", "*-sidecar"],
    injectAnnotationKeys: ["blekline.com/inject-sidecar", "*inject*", "*sidecar*"],
    autoRouteDisabledKeys: ["blekline.com/auto-route"],
    autoRouteIptablesKeys: ["blekline.com/auto-route"],
    enforcementPorts: [8787, 15001],
    authSecretNamePatterns: ["blekline-sidecar-auth", "blekline-sidecar-secret", "*-sidecar-auth"],
    llmEnvPrefixes: ["OPENAI_", "ANTHROPIC_", "AZURE_OPENAI", "LANGCHAIN_", "MCP_", "BLEKLINE_"],
    sidecarPathEnvKeys: [
      "OPENAI_BASE_URL",
      "OPENAI_API_BASE",
      "ANTHROPIC_BASE_URL",
      "BLEKLINE_SIDECAR_URL",
      "BLEKLINE_AUTO_ROUTE",
    ],
  },
  networkPolicy: {
    mandatoryHopNamePatterns: ["mandatory-hop", "agent-egress", "blekline-hop", "enforcement-hop"],
    wideEgressCidrs: ["0.0.0.0/0", "::/0"],
  },
  admission: {
    enforcementWebhookNamePatterns: ["blekline", "*inject*", "*sidecar*"],
  },
  output: {
    schemaVersion: "2.0",
    suppressVendorCta: false,
  },
  probe: {
    enforcePath: "/v1/enforce-tool-call",
    healthPath: "/health",
    allowNamespaces: [],
  },
};

function mergeConfig(base: AuditConfig, patch: Partial<AuditConfig>): AuditConfig {
  return {
    ...base,
    ...patch,
    discovery: { ...base.discovery, ...patch.discovery },
    enforcement: { ...base.enforcement, ...patch.enforcement },
    networkPolicy: { ...base.networkPolicy, ...patch.networkPolicy },
    admission: { ...base.admission, ...patch.admission },
    allowlist: { ...base.allowlist, ...patch.allowlist },
    output: { ...base.output, ...patch.output },
    probe: { ...base.probe, ...patch.probe },
  };
}

export function resolveAuditConfig(
  profile: AuditProfileName = "generic",
  fileConfig?: Partial<AuditConfig>,
): AuditConfig {
  const base =
    profile === "blekline"
      ? mergeConfig(GENERIC_DEFAULTS, BLEKLINE_OVERRIDES as AuditConfig)
      : structuredClone(GENERIC_DEFAULTS);
  base.profile = profile;
  if (fileConfig) {
    return mergeConfig(base, fileConfig);
  }
  return base;
}

export { GENERIC_DEFAULTS, BLEKLINE_OVERRIDES };
