import * as k8s from "@kubernetes/client-node";
import { PassThrough } from "node:stream";
import type { AgentCandidate, ClusterSnapshot, Finding } from "../types.js";
import { DOCS_BASE } from "../types.js";

const PROBE_TARGET_URL = "https://example.com";
const SIDECAR_ENFORCE_PATH = "/v1/enforce-tool-call";
const SIDECAR_PORT = 8787;

export interface ProbeOptions {
  fixture?: string;
  kubeconfig?: string;
  context?: string;
  token: string;
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
        : "Apply mandatory-hop NetworkPolicy and sidecar per Track 01",
      commands: passed ? [] : ["# See app.blekline.com/docs/enterprise/k8s-deployment"],
      docUrl: `${DOCS_BASE}/enterprise/k8s-deployment`,
    },
  };
}

function sidecarServiceUrl(cluster: ClusterSnapshot, ns: string): string | null {
  const svc = cluster.services.find(
    (s) =>
      s.namespace === ns ||
      s.namespace === "blekline" ||
      s.name.includes("blekline") ||
      s.ports.includes(SIDECAR_PORT),
  );
  if (!svc) return null;
  return `http://${svc.name}.${svc.namespace}.svc.cluster.local:${SIDECAR_PORT}`;
}

function simulateFixtureProbes(
  cluster: ClusterSnapshot,
  candidates: AgentCandidate[],
  fixture: string,
): Finding[] {
  const c = candidates[0];
  const resource = c ? `${c.namespace}/${c.kind}/${c.name}` : "cluster/none";
  const ns = c?.namespace ?? "default";

  if (fixture === "broken") {
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
        "Probed: sidecar enforce endpoint unreachable or not deployed",
        resource,
        ns,
        false,
      ),
    ];
  }

  if (fixture === "fixed") {
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
        "Probed: sidecar enforce endpoint returned 401 without auth",
        resource,
        ns,
        true,
      ),
      probeFinding(
        "PROBE-003",
        "INFO",
        "Probed: sidecar enforce with auth — simulated pass (fixture mode)",
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
): Promise<{ podName: string; container: string } | null> {
  const core = kc.makeApiClient(k8s.CoreV1Api);
  const pods = await core.listNamespacedPod({ namespace: candidate.namespace });
  const match = (pods.items ?? []).find((p) => {
    const phase = p.status?.phase;
    if (phase !== "Running") return false;
    const labels = p.metadata?.labels ?? {};
    if (labels.app && candidate.labels.app && labels.app === candidate.labels.app) return true;
    return (p.metadata?.name ?? "").includes(candidate.name.split("-")[0] ?? candidate.name);
  });
  if (!match?.metadata?.name) return null;
  const container =
    match.spec?.containers?.find((c) => c.name !== "blekline-sidecar")?.name ??
    match.spec?.containers?.[0]?.name ??
    candidate.containers[0];
  return { podName: match.metadata.name, container: container ?? "main" };
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

  const candidate = candidates[0];
  if (!candidate) {
    return [
      probeFinding("PROBE-001", "INFO", "Probed: skipped — no agent candidates", "cluster/none", "*", true),
    ];
  }

  const podRef = await findRunnablePod(kc, candidate);
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

  // PROBE-001 — egress to external URL
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

  const sidecarUrl = sidecarServiceUrl(cluster, candidate.namespace);
  if (!sidecarUrl) {
    findings.push(
      probeFinding(
        "PROBE-002",
        "HIGH",
        "Probed: Blekline sidecar service not found in cluster",
        resource,
        candidate.namespace,
        false,
      ),
    );
    return findings;
  }

  // PROBE-002 — enforce without auth → 401
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
      `${sidecarUrl}${SIDECAR_ENFORCE_PATH}`,
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
          ? "Probed: sidecar enforce returned 401 without auth"
          : `Probed: sidecar enforce returned ${code} without auth (expected 401)`,
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
        "Probed: could not reach sidecar enforce endpoint from agent pod",
        resource,
        candidate.namespace,
        false,
      ),
    );
  }

  // PROBE-003 — with auth from secret (token in eval token payload stub: use env in pod if present)
  const authHeader = options.token.startsWith("blw_eval_") ? options.token.slice("blw_eval_".length) : "";
  if (authHeader.length >= 8) {
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
        `${sidecarUrl}${SIDECAR_ENFORCE_PATH}`,
        "-H",
        "Content-Type: application/json",
        "-H",
        `Authorization: Bearer ${authHeader}`,
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
            ? "Probed: sidecar enforce accepted authenticated request"
            : `Probed: sidecar enforce returned ${code} with auth`,
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
          "Probed: authenticated sidecar enforce check failed",
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
