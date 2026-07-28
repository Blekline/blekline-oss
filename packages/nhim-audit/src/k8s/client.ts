import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k8s from "@kubernetes/client-node";
import type {
  ClusterSnapshot,
  NetworkPolicySnapshot,
  PodSnapshot,
  ServiceSnapshot,
  WebhookSnapshot,
  WorkloadSnapshot,
} from "../types.js";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

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
}

export async function loadClusterSnapshot(options: LoadOptions = {}): Promise<ClusterSnapshot> {
  if (options.fixture) {
    return loadFixture(options.fixture);
  }
  return loadFromApi(options);
}

export function loadFixture(name: string): ClusterSnapshot {
  const path = join(PACKAGE_ROOT, "fixtures/clusters", `${name}.json`);
  if (!existsSync(path)) {
    throw new K8sLoadError(`Fixture not found: ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as ClusterSnapshot;
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
        "Could not load kubeconfig. Set KUBECONFIG or pass --kubeconfig. Apply packages/nhim-audit/deploy/rbac/nhim-audit-reader.yaml first.",
      );
    }
  }
  if (options.context) kc.setCurrentContext(options.context);

  const clusterName = kc.getCurrentCluster()?.name ?? "unknown";
  const core = kc.makeApiClient(k8s.CoreV1Api);
  const apps = kc.makeApiClient(k8s.AppsV1Api);
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
    const networkPolicies: NetworkPolicySnapshot[] = [];
    const services: ServiceSnapshot[] = [];
    const secrets: { namespace: string; name: string }[] = [];

    for (const ns of namespaces) {
      const [podRes, depRes, rsRes, stsRes, npRes, svcRes, secRes] = await Promise.all([
        core.listNamespacedPod({ namespace: ns }),
        apps.listNamespacedDeployment({ namespace: ns }),
        apps.listNamespacedReplicaSet({ namespace: ns }),
        apps.listNamespacedStatefulSet({ namespace: ns }),
        networking.listNamespacedNetworkPolicy({ namespace: ns }).catch(() => ({ items: [] })),
        core.listNamespacedService({ namespace: ns }),
        core.listNamespacedSecret({ namespace: ns }).catch(() => ({ items: [] })),
      ]);

      for (const p of podRes.items ?? []) {
        pods.push(mapPod(p));
      }
      for (const d of depRes.items ?? []) {
        deployments.push(mapWorkload(d.metadata, d.spec?.template));
      }
      for (const r of rsRes.items ?? []) {
        replicaSets.push(mapWorkload(r.metadata, r.spec?.template));
      }
      for (const s of stsRes.items ?? []) {
        statefulSets.push(mapWorkload(s.metadata, s.spec?.template));
      }
      for (const np of npRes.items ?? []) {
        networkPolicies.push(mapNetworkPolicy(np, ns));
      }
      for (const s of svcRes.items ?? []) {
        services.push(mapService(s, ns));
      }
      for (const s of secRes.items ?? []) {
        if (s.metadata?.name) secrets.push({ namespace: ns, name: s.metadata.name });
      }
    }

    let mutatingWebhooks: WebhookSnapshot[] = [];
    try {
      const mwh = await admission.listMutatingWebhookConfiguration();
      mutatingWebhooks = (mwh.items ?? []).map(mapMutatingWebhook);
    } catch (e) {
      throw rbacError("mutatingwebhookconfigurations", e);
    }

    return {
      clusterName,
      namespaces,
      pods,
      deployments,
      replicaSets,
      statefulSets,
      networkPolicies,
      mutatingWebhooks,
      validatingWebhooks: [],
      services,
      secrets,
      hasGatekeeper: mutatingWebhooks.some((w) => w.name.toLowerCase().includes("gatekeeper")),
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
      `RBAC denied listing ${resource}. Apply packages/nhim-audit/deploy/rbac/nhim-audit-reader.yaml or grant equivalent list/get/watch permissions.`,
    );
  }
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(msg)) {
    return new K8sLoadError(`Cluster unreachable: ${msg}`, 3);
  }
  return new K8sLoadError(msg, 2);
}

function mapPod(p: k8s.V1Pod): PodSnapshot {
  const containers = p.spec?.containers ?? [];
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
  };
}

function mapWorkload(
  meta: k8s.V1ObjectMeta | undefined,
  template: k8s.V1PodTemplateSpec | undefined,
): WorkloadSnapshot {
  const containers = template?.spec?.containers ?? [];
  return {
    namespace: meta?.namespace ?? "",
    name: meta?.name ?? "",
    labels: { ...(template?.metadata?.labels ?? {}), ...(meta?.labels ?? {}) },
    annotations: { ...(template?.metadata?.annotations ?? {}), ...(meta?.annotations ?? {}) },
    containers: containers.map((c) => c.name ?? ""),
    envKeys: containers.flatMap((c) => (c.env ?? []).map((e) => e.name ?? "").filter(Boolean)),
    image: containers[0]?.image ?? "",
  };
}

function mapNetworkPolicy(np: k8s.V1NetworkPolicy, ns: string): NetworkPolicySnapshot {
  const policyTypes = np.spec?.policyTypes ?? [];
  const egress = np.spec?.egress ?? [];
  const egressRestricted = policyTypes.includes("Egress") && egress.length > 0;
  return {
    namespace: ns,
    name: np.metadata?.name ?? "",
    podSelector: np.spec?.podSelector?.matchLabels ?? {},
    policyTypes,
    egressRestricted,
    allowsSidecarHop: egressRestricted,
  };
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
  };
}
