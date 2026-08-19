export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type ScoreBand = "CRITICAL" | "AT RISK" | "PARTIAL" | "HARDENED";

export type StaticGateStatus = "pass" | "fail" | "unknown";

/** @deprecated Use StaticGateStatus — kept for 0.1.x JSON readers */
export type RedTeamPhase0 = StaticGateStatus;

export type AuditProfileName = "generic" | "blekline";

export type EvidenceKind = "static" | "probed";

export type Confidence = "high" | "medium" | "low";

export interface VendorHint {
  vendor: string;
  commands: string[];
  docUrl?: string;
}

export interface DiscoveryInfo {
  signals: string[];
  confidence?: Confidence;
}

export interface FixInfo {
  summary: string;
  commands: string[];
  docUrl: string;
  vendorHints?: VendorHint[];
}

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  subtitle?: string;
  resource: string;
  namespace: string;
  asi: string[];
  static: boolean;
  evidence: EvidenceKind;
  probeId?: string;
  discovery?: DiscoveryInfo;
  fix: FixInfo;
  pentestScope?: string[];
}

export interface AgentCandidate {
  namespace: string;
  name: string;
  kind: "Pod" | "Deployment" | "ReplicaSet" | "StatefulSet" | "Job" | "CronJob";
  ownerRef?: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  containers: string[];
  envKeys: string[];
  image: string;
  signals: string[];
  confidence: Confidence;
  hostNetwork?: boolean;
  privileged?: boolean;
  hostPID?: boolean;
  usesEnvFrom?: boolean;
}

export interface ClusterSnapshot {
  clusterName: string;
  namespaces: string[];
  pods: PodSnapshot[];
  deployments: WorkloadSnapshot[];
  replicaSets: WorkloadSnapshot[];
  statefulSets: WorkloadSnapshot[];
  jobs: WorkloadSnapshot[];
  cronJobs: WorkloadSnapshot[];
  networkPolicies: NetworkPolicySnapshot[];
  mutatingWebhooks: WebhookSnapshot[];
  validatingWebhooks: WebhookSnapshot[];
  services: ServiceSnapshot[];
  secrets: SecretSnapshot[];
  hasGatekeeper: boolean;
  hasKyverno: boolean;
  hasIstioAuthPolicy: boolean;
  hasBleklineHelm: boolean;
}

export interface PodSnapshot {
  namespace: string;
  name: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  containers: string[];
  envKeys: string[];
  image: string;
  ownerKind?: string;
  ownerName?: string;
  hostNetwork?: boolean;
  privileged?: boolean;
  hostPID?: boolean;
  usesEnvFrom?: boolean;
}

export interface WorkloadSnapshot {
  namespace: string;
  name: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  containers: string[];
  envKeys: string[];
  image: string;
  hostNetwork?: boolean;
  privileged?: boolean;
  hostPID?: boolean;
  usesEnvFrom?: boolean;
}

export interface NetworkPolicySnapshot {
  namespace: string;
  name: string;
  podSelector: Record<string, string>;
  policyTypes: string[];
  egressRestricted: boolean;
  allowsSidecarHop: boolean;
  allowsWideHttpsEgress: boolean;
}

export interface WebhookSnapshot {
  name: string;
  failurePolicy: string;
  matchesBlekline: boolean;
  matchesEnforcement: boolean;
}

export interface ServiceSnapshot {
  namespace: string;
  name: string;
  type: string;
  ports: number[];
  selector: Record<string, string>;
}

export interface SecretSnapshot {
  namespace: string;
  name: string;
}

export interface AssuranceBlock {
  notCertification: true;
  staticOnly: boolean;
  probeExecuted: boolean;
  /** Set when BLEKLINE_EVAL_ONLINE=1 and validate endpoint confirms the token. */
  probeTokenValidatedOnline?: boolean;
  limitations: string[];
}

export interface ReportIntegrity {
  sha256: string;
}

export interface ScoreResult {
  value: number;
  band: ScoreBand;
  controlObjective: string;
  staticGateStatus: StaticGateStatus;
  /** @deprecated mirror of staticGateStatus for 0.1.x consumers */
  redTeamPhase0?: StaticGateStatus;
  scoringVersion: number;
}

export interface AuditReport {
  generator: string;
  version: string;
  schemaVersion: "2.0";
  profile: AuditProfileName;
  scoringVersion: number;
  configFingerprint?: string;
  cluster: string;
  timestamp: string;
  mode: "static" | "static+probe";
  candidates: AgentCandidate[];
  findings: Finding[];
  suppressedFindings?: string[];
  score: ScoreResult;
  summary: {
    candidates: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    probed: number;
  };
  assurance: AssuranceBlock;
  probeAvailable: boolean;
  disclaimer: string;
  reportIntegrity?: ReportIntegrity;
}

export const STATIC_SUBTITLE = "(STATIC — run --probe to verify)";

export const EVIDENCE_DISCLAIMER =
  "Evidence enablement only — not certification. Static findings infer architectural risk.";

export const ASSURANCE_LIMITATIONS: string[] = [
  "Static scan — runtime bypass not proven without --probe",
  "Agent candidate heuristics may produce false positives or false negatives",
  "Kubernetes NetworkPolicy view only — CiliumNetworkPolicy / cloud SG / NACL out of scope",
  "Service mesh enforcement (Istio AuthZ) may not be fully verified statically",
  "Not a penetration test, SOC2, OWASP, AIUC-1, or EU AI Act certification",
  "Trust Vault SPIFFE, contamination API, kill switch RBAC require separate validation",
];

export const DOCS_BASE = "https://app.blekline.com/docs";
export const OSS_HELM_CHART = "packages/ingress-proxy/helm/blekline-ingress";
export const PILOT_SIDECAR_IMAGE = "ghcr.io/blekline/sidecar:0.2.1-nhim";
export const OSS_HELM_REPO =
  "https://github.com/Blekline/blekline-oss/tree/main/packages/ingress-proxy/helm/blekline-ingress";
/** @deprecated Use OSS_HELM_CHART */
export const OSS_HELM_BASE = OSS_HELM_CHART;
