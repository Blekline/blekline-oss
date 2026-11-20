import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k8s from "@kubernetes/client-node";
import { matchesWebhookName, matchesNpName } from "../config/match.js";
import { GENERIC_DEFAULTS } from "../config/profile.js";
import type {
  ClusterSnapshot,
  NetworkPolicySnapshot,
  PodSnapshot,
  ServiceSnapshot,
  WebhookSnapshot,
  WorkloadSnapshot,
} from "../types.js";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

const DEFAULT_NP_PATTERNS = GENERIC_DEFAULTS.networkPolicy.mandatoryHopNamePatterns;
const DEFAULT_WH_PATTERNS = GENERIC_DEFAULTS.admission.enforcementWebhookNamePatterns;
const ENFORCEMENT_PORTS = GENERIC_DEFAULTS.enforcement.enforcementPorts;

export class K8sLoadError extends Error {
  readonly code: 2 | 3;
  constructor(message: string, code: 2 | 3 = 2) {
    super(message);
    this.name = "K8sLoadError";
    this.code = code;
  }
}

export interface LoadOptions {
  kubeconfig?: string;
  context?: string;
  fixture?: string;
  namespaces?: string[];
  includeKubeSystem?: boolean;
  includePods?: boolean;
  clusterAlias?: string;
}

export async function loadClusterSnapshot(options: LoadOptions = {}): Promise<ClusterSnapshot> {
  if (options.fixture) {
    return normalizeFixture(loadFixture(options.fixture));
  }
  const snap = await loadFromApi(options);
  if (options.clusterAlias) {
    snap.clusterName = options.clusterAlias;
  }
  return snap;
}

export function loadFixture(name: string): ClusterSnapshot {
  const path = join(PACKAGE_ROOT, "fixtures/clusters", `${name}.json`);
  if (!existsSync(path)) {
    throw new K8sLoadError(`Fixture not found: ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as ClusterSnapshot;
}

function normalizeFixture(s: ClusterSnapshot): ClusterSnapshot {
  return {
    ...s,
    jobs: s.jobs ?? [],
    cronJobs: s.cronJobs ?? [],
    validatingWebhooks: s.validatingWebhooks ?? [],
    hasKyverno: s.hasKyverno ?? false,
    hasIstioAuthPolicy: s.hasIstioAuthPolicy ?? false,
    mutatingWebhooks: (s.mutatingWebhooks ?? []).map((w) => ({
      ...w,
      matchesEnforcement:
        w.matchesEnforcement ??
        (matchesWebhookName(DEFAULT_WH_PATTERNS, w.name) || Boolean(w.matchesBlekline)),
    })),
  };
}

async function loadFromApi(options: LoadOptions): Promise<ClusterSnapshot> {
  const kc = new k8s.KubeConfig();
  if (options.kubeconfig) {
    kc.loadFromFile(options.kubeconfig);
  } else {
    try {
      kc.loadFromDefault();
    } catch {
      throw new K8sLoadError(
        "Could not load kubeconfig. Set KUBECONFIG or pass --kubeconfig. Apply deploy/rbac/nhim-audit-reader-namespaced.yaml first.",
      );
    }
  }
  if (options.context) kc.setCurrentContext(options.context);

  const clusterName = kc.getCurrentCluster()?.name ?? "unknown";
  const core = kc.makeApiClient(k8s.CoreV1Api);
  const apps = kc.makeApiClient(k8s.AppsV1Api);
  const batch = kc.makeApiClient(k8s.BatchV1Api);
  const networking = kc.makeApiClient(k8s.NetworkingV1Api);
  const admission = kc.makeApiClient(k8s.AdmissionregistrationV1Api);

  try {
    const nsRes = await core.listNamespace();
    let namespaces = (nsRes.items ?? []).map((n) => n.metadata?.name ?? "").filter(Boolean);
    if (!options.includeKubeSystem) {
      namespaces = namespaces.filter((n) => n !== "kube-system" && n !== "kube-public");
    }
    if (options.namespaces?.length) {
      namespaces = namespaces.filter((n) => options.namespaces!.includes(n));
    }

    const pods: PodSnapshot[] = [];
    const deployments: WorkloadSnapshot[] = [];
    const replicaSets: WorkloadSnapshot[] = [];
    const statefulSets: WorkloadSnapshot[] = [];
    const jobs: WorkloadSnapshot[] = [];
    const cronJobs: WorkloadSnapshot[] = [];
    const networkPolicies: NetworkPolicySnapshot[] = [];
    const services: ServiceSnapshot[] = [];
    const secrets: { namespace: string; name: string }[] = [];

    for (const ns of namespaces) {
      const [podRes, depRes, rsRes, stsRes, jobRes, cjRes, npRes, svcRes, secRes] = await Promise.all([
        core.listNamespacedPod({ namespace: ns }),
        apps.listNamespacedDeployment({ namespace: ns }),
        apps.listNamespacedReplicaSet({ namespace: ns }),
        apps.listNamespacedStatefulSet({ namespace: ns }),
        batch.listNamespacedJob({ namespace: ns }).catch(() => ({ items: [] })),
        batch.listNamespacedCronJob({ namespace: ns }).catch(() => ({ items: [] })),
        networking.listNamespacedNetworkPolicy({ namespace: ns }).catch(() => ({ items: [] })),
        core.listNamespacedService({ namespace: ns }),
        core.listNamespacedSecret({ namespace: ns }).catch(() => ({ items: [] })),
      ]);

      for (const p of podRes.items ?? []) pods.push(mapPod(p));
      for (const d of depRes.items ?? []) deployments.push(mapWorkload(d.metadata, d.spec?.template));
      for (const r of rsRes.items ?? []) replicaSets.push(mapWorkload(r.metadata, r.spec?.template));
      for (const s of stsRes.items ?? []) statefulSets.push(mapWorkload(s.metadata, s.spec?.template));
      for (const j of jobRes.items ?? []) jobs.push(mapWorkload(j.metadata, j.spec?.template));
      for (const cj of cjRes.items ?? []) cronJobs.push(mapCronJob(cj));
      for (const np of npRes.items ?? []) networkPolicies.push(mapNetworkPolicy(np, ns));
      for (const s of svcRes.items ?? []) services.push(mapService(s, ns));
      for (const s of secRes.items ?? []) {
        if (s.metadata?.name) secrets.push({ namespace: ns, name: s.metadata.name });
      }
    }

    let mutatingWebhooks: WebhookSnapshot[] = [];
    let validatingWebhooks: WebhookSnapshot[] = [];
    try {
      const mwh = await admission.listMutatingWebhookConfiguration();
      mutatingWebhooks = (mwh.items ?? []).map(mapMutatingWebhook);
      const vwh = await admission.listValidatingWebhookConfiguration();
      validatingWebhooks = (vwh.items ?? []).map(mapValidatingWebhook);
    } catch (e) {
      throw rbacError("mutatingwebhookconfigurations", e);
    }

    const hasIstioAuthPolicy = pods.some(
      (p) =>
        p.annotations["sidecar.istio.io/status"] ||
        Object.keys(p.labels).some((k) => k.includes("istio")),
    );

    return {
      clusterName,
      namespaces,
      pods,
      deployments: mergePodEnvIntoWorkloads(deployments, pods, options.includePods),
      replicaSets: mergePodEnvIntoWorkloads(replicaSets, pods, options.includePods),
      statefulSets: mergePodEnvIntoWorkloads(statefulSets, pods, options.includePods),
      jobs: mergePodEnvIntoWorkloads(jobs, pods, options.includePods),
      cronJobs,
      networkPolicies,
      mutatingWebhooks,
      validatingWebhooks,
      services,
      secrets,
      hasGatekeeper: [...mutatingWebhooks, ...validatingWebhooks].some((w) =>
        w.name.toLowerCase().includes("gatekeeper"),
      ),
      hasKyverno: [...mutatingWebhooks, ...validatingWebhooks].some((w) =>
        w.name.toLowerCase().includes("kyverno"),
      ),
      hasIstioAuthPolicy,
      hasBleklineHelm: services.some(
        (s) => s.name.includes("blekline") || s.selector.app?.includes("blekline"),
      ),
    };
  } catch (e) {
    if (e instanceof K8sLoadError) throw e;
    throw rbacError("cluster resources", e);
  }
}

function rbacError(resource: string, e: unknown): K8sLoadError {
  const msg = e instanceof Error ? e.message : String(e);
  if (/403|Forbidden|Unauthorized/i.test(msg)) {
    return new K8sLoadError(
      `RBAC denied listing ${resource}. Apply deploy/rbac/nhim-audit-reader-namespaced.yaml or grant equivalent permissions.`,
    );
  }
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(msg)) {
    return new K8sLoadError(`Cluster unreachable: ${msg}`, 3);
  }
  return new K8sLoadError(msg, 2);
}

function mergePodEnvIntoWorkloads(
  workloads: WorkloadSnapshot[],
  pods: PodSnapshot[],
  includePods?: boolean,
): WorkloadSnapshot[] {
  if (!includePods) return workloads;
  return workloads.map((w) => {
    const livePods = pods.filter(
      (p) =>
        p.namespace === w.namespace &&
        (p.ownerName === w.name || p.name.startsWith(`${w.name}-`)),
    );
    if (livePods.length === 0) return w;
    return {
      ...w,
      envKeys: [...new Set([...livePods.flatMap((p) => p.envKeys), ...w.envKeys])],
      annotations: { ...w.annotations, ...livePods[0]?.annotations },
      containers: [...new Set([...livePods.flatMap((p) => p.containers), ...w.containers])],
      hostNetwork: w.hostNetwork || livePods.some((p) => p.hostNetwork),
      privileged: w.privileged || livePods.some((p) => p.privileged),
      hostPID: w.hostPID || livePods.some((p) => p.hostPID),
      usesEnvFrom: w.usesEnvFrom || livePods.some((p) => p.usesEnvFrom),
    };
  });
}

function containerSecurity(c: k8s.V1Container | undefined) {
  const sc = c?.securityContext;
  return {
    privileged: sc?.privileged === true,
  };
}

function podSpecFlags(spec: k8s.V1PodSpec | undefined) {
  const containers = spec?.containers ?? [];
  const envFrom = containers.some((c) => (c.envFrom?.length ?? 0) > 0);
  const privileged = containers.some((c) => containerSecurity(c).privileged);
  return {
    hostNetwork: spec?.hostNetwork === true,
    hostPID: spec?.hostPID === true,
    privileged,
    usesEnvFrom: envFrom,
  };
}

function mapPod(p: k8s.V1Pod): PodSnapshot {
  const containers = p.spec?.containers ?? [];
  const flags = podSpecFlags(p.spec);
  return {
    namespace: p.metadata?.namespace ?? "",
    name: p.metadata?.name ?? "",
    labels: p.metadata?.labels ?? {},
    annotations: p.metadata?.annotations ?? {},
    containers: containers.map((c) => c.name ?? ""),
    envKeys: containers.flatMap((c) => (c.env ?? []).map((e) => e.name ?? "").filter(Boolean)),
    image: containers[0]?.image ?? "",
    ownerKind: p.metadata?.ownerReferences?.[0]?.kind,
    ownerName: p.metadata?.ownerReferences?.[0]?.name,
    ...flags,
  };
}

function mapWorkload(
  meta: k8s.V1ObjectMeta | undefined,
  template: k8s.V1PodTemplateSpec | undefined,
): WorkloadSnapshot {
  const containers = template?.spec?.containers ?? [];
  const flags = podSpecFlags(template?.spec);
  return {
    namespace: meta?.namespace ?? "",
    name: meta?.name ?? "",
    labels: { ...(template?.metadata?.labels ?? {}), ...(meta?.labels ?? {}) },
    annotations: { ...(template?.metadata?.annotations ?? {}), ...(meta?.annotations ?? {}) },
    containers: containers.map((c) => c.name ?? ""),
    envKeys: containers.flatMap((c) => (c.env ?? []).map((e) => e.name ?? "").filter(Boolean)),
    image: containers[0]?.image ?? "",
    ...flags,
  };
}

function mapCronJob(cj: k8s.V1CronJob): WorkloadSnapshot {
  return mapWorkload(cj.metadata, cj.spec?.jobTemplate?.spec?.template);
}

function mapNetworkPolicy(np: k8s.V1NetworkPolicy, ns: string): NetworkPolicySnapshot {
  const policyTypes = np.spec?.policyTypes ?? [];
  const egress = np.spec?.egress ?? [];
  const egressRestricted = policyTypes.includes("Egress") && egress.length > 0;
  const allowsWideHttpsEgress = detectWideHttpsEgress(np);
  const sidecarHop = egressRestricted && detectSidecarHopInEgress(np);
  return {
    namespace: ns,
    name: np.metadata?.name ?? "",
    podSelector: np.spec?.podSelector?.matchLabels ?? {},
    policyTypes,
    egressRestricted,
    allowsSidecarHop: sidecarHop && !allowsWideHttpsEgress,
    allowsWideHttpsEgress,
  };
}

function detectWideHttpsEgress(np: k8s.V1NetworkPolicy): boolean {
  for (const rule of np.spec?.egress ?? []) {
    for (const target of rule.to ?? []) {
      const cidr = target.ipBlock?.cidr ?? "";
      if (
        (cidr === "0.0.0.0/0" || cidr === "::/0") &&
        (rule.ports ?? []).some((p) => p.port === 443 || String(p.port) === "443")
      ) {
        return true;
      }
    }
  }
  return false;
}

function detectSidecarHopInEgress(np: k8s.V1NetworkPolicy): boolean {
  const name = np.metadata?.name ?? "";
  if (matchesNpName(DEFAULT_NP_PATTERNS, name)) return true;

  const egress = np.spec?.egress ?? [];
  for (const rule of egress) {
    for (const target of rule.to ?? []) {
      const podLabels = target.podSelector?.matchLabels ?? {};
      for (const [key, val] of Object.entries(podLabels)) {
        const combined = `${key}=${val}`.toLowerCase();
        if (combined.includes("sidecar") || combined.includes("proxy") || combined.includes("envoy")) {
          return true;
        }
      }
    }
    const ports = rule.ports ?? [];
    if (ports.some((p) => ENFORCEMENT_PORTS.includes(Number(p.port)))) return true;
  }
  return false;
}

function mapService(s: k8s.V1Service, ns: string): ServiceSnapshot {
  return {
    namespace: ns,
    name: s.metadata?.name ?? "",
    type: s.spec?.type ?? "ClusterIP",
    ports: (s.spec?.ports ?? []).map((p) => p.port ?? 0),
    selector: s.spec?.selector ?? {},
  };
}

function mapMutatingWebhook(w: k8s.V1MutatingWebhookConfiguration): WebhookSnapshot {
  const name = w.metadata?.name ?? "";
  const hook = w.webhooks?.[0];
  return {
    name,
    failurePolicy: hook?.failurePolicy ?? "Ignore",
    matchesBlekline: name.toLowerCase().includes("blekline"),
    matchesEnforcement: matchesWebhookName(DEFAULT_WH_PATTERNS, name) || name.toLowerCase().includes("blekline"),
  };
}

function mapValidatingWebhook(w: k8s.V1ValidatingWebhookConfiguration): WebhookSnapshot {
  const name = w.metadata?.name ?? "";
  const hook = w.webhooks?.[0];
  return {
    name,
    failurePolicy: hook?.failurePolicy ?? "Ignore",
    matchesBlekline: false,
    matchesEnforcement: matchesWebhookName(DEFAULT_WH_PATTERNS, name),
  };
}
