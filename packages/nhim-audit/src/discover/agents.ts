import type { AgentCandidate, Confidence, PodSnapshot, WorkloadSnapshot } from "../types.js";

const AGENT_LABEL_KEYS = [
  "blekline-agent",
  "app.kubernetes.io/component",
  "langgraph",
  "crewai",
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

const SIDEcar_CONTAINER = "blekline-sidecar";
const INJECT_ANNOTATION = "blekline.com/inject-sidecar";

export interface DiscoverOptions {
  labelSelector?: string;
  customSelector?: Record<string, string>;
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
  if (signals.some((s) => s.startsWith("env:") || s.startsWith("label:blekline-agent"))) {
    return "high";
  }
  if (signals.some((s) => s.startsWith("label:"))) return "medium";
  return "low";
}

function collectSignals(
  labels: Record<string, string>,
  envKeys: string[],
  image: string,
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
  return [...new Set(signals)];
}

function workloadToCandidate(w: WorkloadSnapshot, kind: AgentCandidate["kind"]): AgentCandidate | null {
  const signals = collectSignals(w.labels, w.envKeys, w.image);
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
  };
}

export function discoverAgents(
  workloads: {
    deployments: WorkloadSnapshot[];
    replicaSets: WorkloadSnapshot[];
    statefulSets: WorkloadSnapshot[];
    pods: PodSnapshot[];
  },
  options: DiscoverOptions = {},
): AgentCandidate[] {
  const candidates: AgentCandidate[] = [];
  const seen = new Set<string>();

  const add = (c: AgentCandidate | null) => {
    if (!c) return;
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

  for (const d of workloads.deployments) add(workloadToCandidate(d, "Deployment"));
  for (const r of workloads.replicaSets) add(workloadToCandidate(r, "ReplicaSet"));
  for (const s of workloads.statefulSets) add(workloadToCandidate(s, "StatefulSet"));
  for (const p of workloads.pods) {
    if (p.ownerKind && p.ownerKind !== "ReplicaSet") continue;
    const signals = collectSignals(p.labels, p.envKeys, p.image);
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
    });
  }

  return candidates;
}

export function hasSidecar(candidate: AgentCandidate): boolean {
  return candidate.containers.some((c) => c === SIDEcar_CONTAINER);
}

export function hasInjectAnnotation(candidate: AgentCandidate): boolean {
  const v = candidate.annotations[INJECT_ANNOTATION];
  return v === "enabled" || v === "true";
}

export function namespaceExcluded(ns: string, includeKubeSystem: boolean): boolean {
  if (includeKubeSystem) return false;
  return ns === "kube-system" || ns === "kube-public";
}
