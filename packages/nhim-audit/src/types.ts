export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type ScoreBand = "CRITICAL" | "AT RISK" | "PARTIAL" | "HARDENED";

export type RedTeamPhase0 = "pass" | "fail" | "unknown";

export type EvidenceKind = "static" | "probed";

export type Confidence = "high" | "medium" | "low";

export interface DiscoveryInfo {
  signals: string[];
  confidence?: Confidence;
}

export interface FixInfo {
  summary: string;
  commands: string[];
  docUrl: string;
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
}

export interface AgentCandidate {
  namespace: string;
  name: string;
  kind: "Pod" | "Deployment" | "ReplicaSet" | "StatefulSet";
  ownerRef?: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  containers: string[];
  envKeys: string[];
  image: string;
  signals: string[];
  confidence: Confidence;
}

export interface ClusterSnapshot {
  clusterName: string;
  namespaces: string[];
  pods: PodSnapshot[];
  deployments: WorkloadSnapshot[];
  replicaSets: WorkloadSnapshot[];
  statefulSets: WorkloadSnapshot[];
  networkPolicies: NetworkPolicySnapshot[];
  mutatingWebhooks: WebhookSnapshot[];
  validatingWebhooks: WebhookSnapshot[];
  services: ServiceSnapshot[];
  secrets: SecretSnapshot[];
  hasGatekeeper: boolean;
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
}

export interface WorkloadSnapshot {
  namespace: string;
  name: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  containers: string[];
  envKeys: string[];
  image: string;
}

export interface NetworkPolicySnapshot {
  namespace: string;
  name: string;
  podSelector: Record<string, string>;
  policyTypes: string[];
  egressRestricted: boolean;
  allowsSidecarHop: boolean;
}

export interface WebhookSnapshot {
  name: string;
  failurePolicy: string;
  matchesBlekline: boolean;
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

export interface ScoreResult {
  value: number;
  band: ScoreBand;
  controlObjective: string;
  redTeamPhase0: RedTeamPhase0;
}

export interface AuditReport {
  generator: string;
  version: string;
  cluster: string;
  timestamp: string;
  mode: "static" | "static+probe";
  candidates: AgentCandidate[];
  findings: Finding[];
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
  probeAvailable: boolean;
  disclaimer: string;
}

export const STATIC_SUBTITLE = "(STATIC — run --probe to verify)";

export const EVIDENCE_DISCLAIMER =
  "Evidence enablement only — not certification. Static findings infer architectural risk.";

export const DOCS_BASE = "https://app.blekline.com/docs";
export const OSS_HELM_BASE =
  "https://github.com/Blekline/blekline-oss/tree/main/packages/ingress-proxy/helm/blekline-ingress";
