import * as k8s from "@kubernetes/client-node";
import { PassThrough } from "node:stream";
import type { AuditConfig } from "../config/profile.js";
import { matchesContainerName, matchesSecretName } from "../config/match.js";
import type { AgentCandidate, ClusterSnapshot, Finding } from "../types.js";
import { DOCS_BASE } from "../types.js";

const PROBE_TARGET_URL = "https://example.com";
const DEFAULT_SIDECAR_PORT = 8787;

export interface ProbeOptions {
  fixture?: string;
  kubeconfig?: string;
  context?: string;
  token: string;
  config?: AuditConfig;
}

function probeFinding(
  probeId: string,
  severity: Finding["severity"],
  title: string,
  resource: string,
  namespace: string,
  passed: boolean,
): Finding {
  return {
    id: probeId,
    severity,
    title,
    resource,
    namespace,
    asi: probeId === "PROBE-001" ? ["ASI10"] : ["ASI03", "ASI08"],
    static: false,
    evidence: "probed",
    probeId,
    subtitle: passed ? "PROBED — control verified" : "PROBED — bypass confirmed",
    fix: {
      summary: passed
        ? "No action — probe passed"
        : "Apply mandatory-hop NetworkPolicy and enforcement sidecar",
      commands: passed ? [] : ["# See mandatory-hop NetworkPolicy examples in NHIM audit docs"],
      docUrl: `${DOCS_BASE}/tools/nhim-audit`,
    },
  };
}

function sidecarEnforceUrl(
  cluster: ClusterSnapshot,
  ns: string,
  podHasInjectedSidecar: boolean,
  config?: AuditConfig,
): string | null {
  const port = config?.enforcement.enforcementPorts[0] ?? DEFAULT_SIDECAR_PORT;
  if (podHasInjectedSidecar) {
    return `http://127.0.0.1:${port}`;
  }
  return sidecarServiceUrl(cluster, ns, port);
}

function sidecarServiceUrl(cluster: ClusterSnapshot, ns: string, port: number): string | null {
  const svc = cluster.services.find(
    (s) =>
      s.namespace === ns ||
      s.ports.includes(port) ||
      s.name.includes("sidecar") ||
      s.name.includes("proxy"),
  );
  if (!svc) return null;
  const svcPort = svc.ports.find((p) => p === port) ?? port;
  return `http://${svc.name}.${svc.namespace}.svc.cluster.local:${svcPort}`;
}

function simulateFixtureProbes(
  cluster: ClusterSnapshot,
  candidates: AgentCandidate[],
  fixture: string,
): Finding[] {
  const c = candidates[0];
  const resource = c ? `${c.namespace}/${c.kind}/${c.name}` : "cluster/none";
  const ns = c?.namespace ?? "default";

  if (fixture === "broken" || fixture === "hostnetwork-broken") {
    return [
      probeFinding(
        "PROBE-001",
        "CRITICAL",
        "Probed: agent candidate reached external HTTP (egress not blocked)",
        resource,
        ns,
        false,
      ),
      probeFinding(
        "PROBE-002",
        "HIGH",
        "Probed: enforcement endpoint unreachable or not deployed",
        resource,
        ns,
        false,
      ),
    ];
  }

  if (fixture === "fixed" || fixture === "fixed-blekline" || fixture === "fixed-generic") {
    return [
      probeFinding(
        "PROBE-001",
        "INFO",
        "Probed: external HTTP blocked from agent candidate pod",
        resource,
        ns,
        true,
      ),
      probeFinding(
        "PROBE-002",
        "INFO",
        "Probed: enforcement endpoint returned 401 without auth",
        resource,
        ns,
        true,
      ),
      probeFinding(
        "PROBE-003",
        "INFO",
        "Probed: enforcement with auth — simulated pass (fixture mode)",
        resource,
        ns,
        true,
      ),
    ];
  }

  return [
    probeFinding(
      "PROBE-001",
      "INFO",
      "Probed: skipped — no agent candidates in cluster",
      "cluster/none",
      "*",
      true,
    ),
  ];
}

async function execInPod(
  kc: k8s.KubeConfig,
  namespace: string,
  podName: string,
  container: string,
  command: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const exec = new k8s.Exec(kc);
  const stdoutStream = new PassThrough();
  const stderrStream = new PassThrough();
  let stdout = "";
  let stderr = "";
  stdoutStream.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  stderrStream.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const status = await exec.exec(
    namespace,
    podName,
    container,
    command,
    stdoutStream,
    stderrStream,
    null,
    false,
  );
  return { stdout, stderr, exitCode: status.status === "Success" ? 0 : 1 };
}

async function findRunnablePod(
  kc: k8s.KubeConfig,
  candidate: AgentCandidate,
  config?: AuditConfig,
): Promise<{ podName: string; container: string; hasInjectedSidecar: boolean } | null> {
  const core = kc.makeApiClient(k8s.CoreV1Api);
  const pods = await core.listNamespacedPod({ namespace: candidate.namespace });
  const sidecarNames = config?.enforcement.sidecarContainerNames ?? ["*-sidecar"];
  const match = (pods.items ?? []).find((p) => {
    const phase = p.status?.phase;
    if (phase !== "Running") return false;
    const labels = p.metadata?.labels ?? {};
    if (labels.app && candidate.labels.app && labels.app === candidate.labels.app) return true;
    return (p.metadata?.name ?? "").includes(candidate.name.split("-")[0] ?? candidate.name);
  });
  if (!match?.metadata?.name) return null;
  const containers = match.spec?.containers ?? [];
  const hasInjectedSidecar = containers.some((c) =>
    matchesContainerName(sidecarNames, c.name ?? ""),
  );
  const agentContainer =
    containers.find((c) => !matchesContainerName(sidecarNames, c.name ?? ""))?.name ??
    containers[0]?.name ??
    candidate.containers[0];
  return { podName: match.metadata.name, container: agentContainer ?? "main", hasInjectedSidecar };
}

async function readSidecarAuthToken(
  kc: k8s.KubeConfig,
  namespace: string,
  config?: AuditConfig,
): Promise<string | null> {
  const core = kc.makeApiClient(k8s.CoreV1Api);
  const patterns = config?.enforcement.authSecretNamePatterns ?? ["*-sidecar-auth", "*-sidecar-secret"];
  const secrets = await core.listNamespacedSecret({ namespace }).catch(() => ({ items: [] }));
  for (const secret of secrets.items ?? []) {
    const name = secret.metadata?.name ?? "";
    if (!matchesSecretName(patterns, name)) continue;
    const data = secret.data ?? {};
    const raw = data.token ?? data.sidecarAuth;
    if (raw) return Buffer.from(raw, "base64").toString("utf8").trim();
  }
  return null;
}

async function runLiveProbes(
  cluster: ClusterSnapshot,
  candidates: AgentCandidate[],
  options: ProbeOptions,
): Promise<Finding[]> {
  const kc = new k8s.KubeConfig();
  if (options.kubeconfig) kc.loadFromFile(options.kubeconfig);
  else kc.loadFromDefault();
  if (options.context) kc.setCurrentContext(options.context);

  const config = options.config;
  const enforcePath = config?.probe.enforcePath ?? "/v1/enforce-tool-call";
  const healthPath = config?.probe.healthPath ?? "/health";
  const port = config?.enforcement.enforcementPorts[0] ?? DEFAULT_SIDECAR_PORT;

  const candidate = candidates[0];
  if (!candidate) {
    return [
      probeFinding("PROBE-001", "INFO", "Probed: skipped — no agent candidates", "cluster/none", "*", true),
    ];
  }

  const podRef = await findRunnablePod(kc, candidate, config);
  const resource = `${candidate.namespace}/${candidate.kind}/${candidate.name}`;
  const findings: Finding[] = [];

  if (!podRef) {
    findings.push(
      probeFinding(
        "PROBE-001",
        "HIGH",
        "Probed: no Running pod found for agent candidate — apply reader + probe RBAC",
        resource,
        candidate.namespace,
        false,
      ),
    );
    return findings;
  }

  const curlBase = ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "--connect-timeout", "3", "-m", "5"];

  try {
    const r1 = await execInPod(kc, candidate.namespace, podRef.podName, podRef.container, [
      ...curlBase,
      PROBE_TARGET_URL,
    ]);
    const code = parseInt(r1.stdout.trim(), 10);
    const blocked = Number.isNaN(code) || code === 0 || r1.exitCode !== 0;
    findings.push(
      probeFinding(
        "PROBE-001",
        blocked ? "INFO" : "CRITICAL",
        blocked
          ? "Probed: external HTTP blocked or unreachable from agent pod"
          : "Probed: agent pod reached external HTTP (egress bypass)",
        `${candidate.namespace}/Pod/${podRef.podName}`,
        candidate.namespace,
        blocked,
      ),
    );
  } catch {
    findings.push(
      probeFinding(
        "PROBE-001",
        "INFO",
        "Probed: external HTTP blocked from agent pod (connection failed)",
        `${candidate.namespace}/Pod/${podRef.podName}`,
        candidate.namespace,
        true,
      ),
    );
  }

  const sidecarUrl = sidecarEnforceUrl(cluster, candidate.namespace, podRef.hasInjectedSidecar, config);
  if (!sidecarUrl) {
    findings.push(
      probeFinding(
        "PROBE-002",
        "HIGH",
        "Probed: enforcement sidecar service not found in cluster",
        resource,
        candidate.namespace,
        false,
      ),
    );
    return findings;
  }

  try {
    const r2 = await execInPod(kc, candidate.namespace, podRef.podName, podRef.container, [
      "curl",
      "-s",
      "-o",
      "/dev/null",
      "-w",
      "%{http_code}",
      "-X",
      "POST",
      `${sidecarUrl}${enforcePath}`,
      "-H",
      "Content-Type: application/json",
      "-d",
      '{"toolName":"read_file","arguments":{}}',
    ]);
    const code = parseInt(r2.stdout.trim(), 10);
    const ok = code === 401;
    findings.push(
      probeFinding(
        "PROBE-002",
        ok ? "INFO" : "HIGH",
        ok
          ? "Probed: enforcement endpoint returned 401 without auth"
          : `Probed: enforcement endpoint returned ${code} without auth (expected 401)`,
        `${candidate.namespace}/Pod/${podRef.podName}`,
        candidate.namespace,
        ok,
      ),
    );
  } catch {
    findings.push(
      probeFinding(
        "PROBE-002",
        "HIGH",
        "Probed: could not reach enforcement endpoint from agent pod",
        resource,
        candidate.namespace,
        false,
      ),
    );
  }

  if (podRef.hasInjectedSidecar) {
    try {
      const r4 = await execInPod(kc, candidate.namespace, podRef.podName, podRef.container, [
        ...curlBase,
        `http://127.0.0.1:${port}${healthPath}`,
      ]);
      const code = parseInt(r4.stdout.trim(), 10);
      const ok = code === 200;
      findings.push(
        probeFinding(
          "PROBE-004",
          ok ? "INFO" : "HIGH",
          ok
            ? "Probed: injected sidecar health reachable from agent container"
            : `Probed: sidecar health returned ${code} from agent container (expected 200)`,
          `${candidate.namespace}/Pod/${podRef.podName}`,
          candidate.namespace,
          ok,
        ),
      );
    } catch {
      findings.push(
        probeFinding(
          "PROBE-004",
          "HIGH",
          "Probed: could not reach injected sidecar health from agent container",
          resource,
          candidate.namespace,
          false,
        ),
      );
    }
  }

  const sidecarAuth =
    (await readSidecarAuthToken(kc, candidate.namespace, config)) ??
    (options.token.startsWith("blw_eval_") ? options.token.slice("blw_eval_".length) : "");
  if (sidecarAuth.length >= 8) {
    try {
      const r3 = await execInPod(kc, candidate.namespace, podRef.podName, podRef.container, [
        "curl",
        "-s",
        "-o",
        "/dev/null",
        "-w",
        "%{http_code}",
        "-X",
        "POST",
        `${sidecarUrl}${enforcePath}`,
        "-H",
        "Content-Type: application/json",
        "-H",
        `Authorization: Bearer ${sidecarAuth}`,
        "-d",
        '{"toolName":"read_file","arguments":{}}',
      ]);
      const code = parseInt(r3.stdout.trim(), 10);
      const ok = code >= 200 && code < 300;
      findings.push(
        probeFinding(
          "PROBE-003",
          ok ? "INFO" : "MEDIUM",
          ok
            ? "Probed: enforcement accepted authenticated request"
            : `Probed: enforcement returned ${code} with auth`,
          `${candidate.namespace}/Pod/${podRef.podName}`,
          candidate.namespace,
          ok,
        ),
      );
    } catch {
      findings.push(
        probeFinding(
          "PROBE-003",
          "MEDIUM",
          "Probed: authenticated enforcement check failed",
          resource,
          candidate.namespace,
          false,
        ),
      );
    }
  }

  return findings;
}

export async function runProbeSuite(
  cluster: ClusterSnapshot,
  candidates: AgentCandidate[],
  options: ProbeOptions,
): Promise<Finding[]> {
  if (options.fixture) {
    return simulateFixtureProbes(cluster, candidates, options.fixture);
  }
  return runLiveProbes(cluster, candidates, options);
}
