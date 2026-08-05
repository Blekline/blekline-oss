import type { AuditConfig } from "../config/profile.js";
import {
  matchesAnnotationKey,
  matchesContainerName,
  globMatch,
} from "../config/match.js";
import type {
  AgentCandidate,
  ClusterSnapshot,
  Confidence,
  PodSnapshot,
  WorkloadSnapshot,
} from "../types.js";

const AGENT_LABEL_KEYS = [
  "app.kubernetes.io/component",
  "langgraph",
  "crewai",
  "agent",
];

const AGENT_LABEL_VALUES = new Set(["true", "agent", "langgraph", "crewai"]);

const ENV_SIGNALS = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "AZURE_OPENAI",
  "LANGCHAIN_",
  "MCP_",
];

const IMAGE_SIGNALS = ["langgraph", "autogen", "mcp", "agent", "crewai"];

export interface DiscoverOptions {
  labelSelector?: string;
  customSelector?: Record<string, string>;
  excludeNamespaces?: string[];
}

function matchesLabelSelector(labels: Record<string, string>, selector?: string): boolean {
  if (!selector) return true;
  for (const part of selector.split(",")) {
    const [k, v] = part.split("=").map((s) => s.trim());
    if (k && labels[k] !== v) return false;
  }
  return true;
}

function scoreSignals(signals: string[]): Confidence {
  if (signals.some((s) => s.startsWith("env:"))) return "high";
  if (signals.some((s) => s.startsWith("label:"))) return "medium";
  return "low";
}

function collectSignals(
  labels: Record<string, string>,
  envKeys: string[],
  image: string,
  usesEnvFrom?: boolean,
): string[] {
  const signals: string[] = [];
  for (const [k, v] of Object.entries(labels)) {
    const kl = k.toLowerCase();
    const vl = v.toLowerCase();
    if (kl.includes("agent") || AGENT_LABEL_VALUES.has(vl) || kl.includes("langgraph")) {
      signals.push(`label:${k}=${v}`);
    }
    for (const key of AGENT_LABEL_KEYS) {
      if (kl.includes(key)) signals.push(`label:${k}=${v}`);
    }
  }
  for (const env of envKeys) {
    if (ENV_SIGNALS.some((p) => env.startsWith(p) || env.includes(p))) {
      signals.push(`env:${env}`);
    }
  }
  const img = image.toLowerCase();
  for (const frag of IMAGE_SIGNALS) {
    if (img.includes(frag)) signals.push(`image:${frag}`);
  }
  if (usesEnvFrom) signals.push("envFrom:secretOrConfigMap");
  return [...new Set(signals)];
}

function workloadToCandidate(
  w: WorkloadSnapshot,
  kind: AgentCandidate["kind"],
): AgentCandidate | null {
  const signals = collectSignals(w.labels, w.envKeys, w.image, w.usesEnvFrom);
  if (signals.length === 0) return null;
  return {
    namespace: w.namespace,
    name: w.name,
    kind,
    labels: w.labels,
    annotations: w.annotations,
    containers: w.containers,
    envKeys: w.envKeys,
    image: w.image,
    signals,
    confidence: scoreSignals(signals),
    hostNetwork: w.hostNetwork,
    privileged: w.privileged,
    hostPID: w.hostPID,
    usesEnvFrom: w.usesEnvFrom,
  };
}

export function discoverAgents(
  cluster: Pick<
    ClusterSnapshot,
    "deployments" | "replicaSets" | "statefulSets" | "jobs" | "cronJobs" | "pods"
  >,
  options: DiscoverOptions = {},
): AgentCandidate[] {
  const candidates: AgentCandidate[] = [];
  const seen = new Set<string>();

  const add = (c: AgentCandidate | null) => {
    if (!c) return;
    if (options.excludeNamespaces?.includes(c.namespace)) return;
    if (!matchesLabelSelector(c.labels, options.labelSelector)) return;
    if (options.customSelector) {
      for (const [k, v] of Object.entries(options.customSelector)) {
        if (c.labels[k] !== v) return;
      }
    }
    const key = `${c.namespace}/${c.kind}/${c.name}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(c);
  };

  for (const d of cluster.deployments) add(workloadToCandidate(d, "Deployment"));
  for (const r of cluster.replicaSets) add(workloadToCandidate(r, "ReplicaSet"));
  for (const s of cluster.statefulSets) add(workloadToCandidate(s, "StatefulSet"));
  for (const j of cluster.jobs ?? []) add(workloadToCandidate(j, "Job"));
  for (const cj of cluster.cronJobs ?? []) add(workloadToCandidate(cj, "CronJob"));
  for (const p of cluster.pods) {
    if (p.ownerKind && p.ownerKind !== "ReplicaSet" && p.ownerKind !== "Job") continue;
    const signals = collectSignals(p.labels, p.envKeys, p.image, p.usesEnvFrom);
    if (signals.length === 0) continue;
    add({
      namespace: p.namespace,
      name: p.name,
      kind: "Pod",
      ownerRef: p.ownerName,
      labels: p.labels,
      annotations: p.annotations,
      containers: p.containers,
      envKeys: p.envKeys,
      image: p.image,
      signals,
      confidence: scoreSignals(signals),
      hostNetwork: p.hostNetwork,
      privileged: p.privileged,
      hostPID: p.hostPID,
      usesEnvFrom: p.usesEnvFrom,
    });
  }

  return candidates;
}

export function hasEnforcementSidecar(candidate: AgentCandidate, config: AuditConfig): boolean {
  if (candidate.annotations["sidecar.istio.io/status"]) return true;
  if (candidate.annotations["linkerd.io/inject"] === "enabled") return true;
  return candidate.containers.some((c) => matchesContainerName(config.enforcement.sidecarContainerNames, c));
}

export function hasInjectAnnotation(candidate: AgentCandidate, config: AuditConfig): boolean {
  for (const [key, value] of Object.entries(candidate.annotations)) {
    for (const pattern of config.enforcement.injectAnnotationKeys) {
      if (pattern.includes("=")) continue;
      if (matchesAnnotationKey([pattern], key) && (value === "enabled" || value === "true")) {
        return true;
      }
    }
    if (key === "blekline.com/inject-sidecar" && (value === "enabled" || value === "true")) {
      return true;
    }
  }
  return false;
}

export function annotationValue(candidate: AgentCandidate, keyPattern: string): string | undefined {
  for (const [key, value] of Object.entries(candidate.annotations)) {
    if (globMatch(keyPattern, key)) return value;
  }
  return undefined;
}

export function hasAutoRouteDisabled(candidate: AgentCandidate, config: AuditConfig): boolean {
  for (const [key, value] of Object.entries(candidate.annotations)) {
    if (
      config.enforcement.autoRouteDisabledKeys.some((p) => globMatch(p, key)) &&
      (value === "disabled" || value === "false")
    ) {
      return true;
    }
  }
  return false;
}

export function hasAutoRouteIptables(candidate: AgentCandidate, config: AuditConfig): boolean {
  for (const [key, value] of Object.entries(candidate.annotations)) {
    if (
      config.enforcement.autoRouteIptablesKeys.some((p) => globMatch(p, key)) &&
      value === "iptables"
    ) {
      return true;
    }
  }
  return false;
}

export function hasLlmEnv(candidate: AgentCandidate, config: AuditConfig): boolean {
  return candidate.envKeys.some((e) =>
    config.enforcement.llmEnvPrefixes.some((p) => e.startsWith(p) || e.includes(p)),
  );
}

export function hasSidecarPathEnv(candidate: AgentCandidate, config: AuditConfig): boolean {
  return candidate.envKeys.some((e) => config.enforcement.sidecarPathEnvKeys.includes(e));
}

export function namespaceExcluded(ns: string, exclude: string[]): boolean {
  return exclude.includes(ns);
}
