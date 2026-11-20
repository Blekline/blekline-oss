/**
 * Context Loop sidecar integration — federated packs, CVR, auto-contaminate, eBPF correlation.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  verifyThreatPack,
  matchThreatSignatures,
  hashPattern,
  detectSuspiciousToolArgs,
  detectSuspiciousToolResult,
  ContextVectorStore,
  computeBaseline,
  anomalyScore,
  embedContextFeatures,
  labelOutcome,
  KernelRingBuffer,
  shouldCorrelateShellTool,
} from "@blekline/runtime-engine";

export function createContextLoop(options) {
  const {
    log,
    emitSiem,
    lineage,
    target,
    sidecarAuth,
    shadowMcpWorkloadId = process.env.BLEKLINE_SHADOW_MCP_WORKLOAD_ID?.trim() || "",
  } = options;

  const enabled = process.env.BLEKLINE_CONTEXT_LOOP !== "false";
  const federatedUrl =
    process.env.BLEKLINE_FEDERATED_PACK_URL?.trim() ||
    `${target.replace(/\/$/, "")}/api/federated/packs/latest`;
  const pullIntervalMs = Number(process.env.BLEKLINE_FEDERATED_PULL_INTERVAL || 6 * 60 * 60 * 1000);
  const stalePackMs = Number(process.env.BLEKLINE_FEDERATED_STALE_MS || 7 * 86400_000);
  const stalePackAction = process.env.BLEKLINE_FEDERATED_STALE_ACTION?.trim() || "alert";
  const anomalyThreshold = Number(process.env.BLEKLINE_ANOMALY_THRESHOLD || 0.72);
  const contextDir =
    process.env.BLEKLINE_CONTEXT_STORE_PATH || join(process.cwd(), "data", "context");
  const publicKeyPath =
    process.env.BLEKLINE_FEDERATED_PUBLIC_KEY_PATH ||
    join(process.cwd(), "data", "federated", "public-key.pem");
  const publicKeyInline = process.env.BLEKLINE_FEDERATED_PUBLIC_KEY_PEM?.trim() || "";
  const contributionUrl =
    process.env.BLEKLINE_FEDERATED_CONTRIBUTE_URL?.trim() ||
    `${target.replace(/\/$/, "")}/api/federated/contributions`;
  const contributionMode = process.env.BLEKLINE_FEDERATED_CONTRIBUTION_MODE?.trim() || "default_on";
  const outcomeSyncUrl =
    process.env.BLEKLINE_CONTEXT_LOOP_OUTCOMES_URL?.trim() ||
    `${target.replace(/\/$/, "")}/api/workspace/context-loop/outcomes`;
  const outcomeSyncIntervalMs = Number(process.env.BLEKLINE_CONTEXT_LOOP_SYNC_INTERVAL || 60_000);
  const outcomeSyncBatchSize = Number(process.env.BLEKLINE_CONTEXT_LOOP_SYNC_BATCH || 50);

  /** @type {{ current: import('@blekline/runtime-engine').FederatedThreatPack | null; previous: import('@blekline/runtime-engine').FederatedThreatPack | null; lastPullAt: number }} */
  const federatedState = { current: null, previous: null, lastPullAt: 0 };

  /** @type {import('@blekline/runtime-engine').OutcomeEvent[]} */
  const outcomes = [];

  /** @type {Map<string, number>} */
  const sessionStartedAt = new Map();

  let vectorStore = null;
  let kernelRing = null;
  let lastSyncedOutcomeIdx = 0;

  if (enabled) {
    try {
      vectorStore = new ContextVectorStore({ dataDir: contextDir });
      kernelRing = new KernelRingBuffer();
      mkdirSync(join(contextDir, "..", "federated"), { recursive: true });
    } catch (err) {
      log.error("context_loop_init_failed", { err: String(err) });
    }
  }

  function resolvePublicKey() {
    if (publicKeyInline) return publicKeyInline;
    if (existsSync(publicKeyPath)) return readFileSync(publicKeyPath, "utf8");
    const bundled = join(process.cwd(), "data", "threats", "signatures", "public-key.pem");
    if (existsSync(bundled)) return readFileSync(bundled, "utf8");
    return "";
  }

  function isPackStale() {
    if (!federatedState.lastPullAt) return false;
    return Date.now() - federatedState.lastPullAt > stalePackMs;
  }

  function resolveWorkloadId({ workloadId, shadowMcp }) {
    if (shadowMcp && shadowMcpWorkloadId) return shadowMcpWorkloadId;
    return workloadId || "default";
  }

  function sessionAgeMs(sessionId) {
    const now = Date.now();
    if (!sessionStartedAt.has(sessionId)) {
      sessionStartedAt.set(sessionId, now);
      return 0;
    }
    return now - sessionStartedAt.get(sessionId);
  }

  async function pullFederatedPack() {
    if (!enabled) return;
    try {
      const headers = { Accept: "application/json" };
      if (sidecarAuth) headers.Authorization = `Bearer ${sidecarAuth}`;
      const res = await fetch(federatedUrl, { headers });
      if (!res.ok) {
        log.warn("federated_pull_failed", { status: res.status });
        emitSiem("federated_pack_stale", { reason: "pull_failed", status: res.status });
        return;
      }
      const pack = await res.json();
      const pub = resolvePublicKey();
      if (!pub) {
        log.warn("federated_no_public_key");
        federatedState.previous = federatedState.current;
        federatedState.current = pack;
        federatedState.lastPullAt = Date.now();
        return;
      }
      const verified = verifyThreatPack(pack, pub);
      if (!verified.ok) {
        log.error("federated_pack_invalid", { error: verified.error });
        return;
      }
      federatedState.previous = federatedState.current;
      federatedState.current = verified.pack;
      federatedState.lastPullAt = Date.now();
      log.info("federated_pack_loaded", {
        version: verified.pack.pack_version,
        sigs: verified.pack.signatures.length,
      });
    } catch (err) {
      log.warn("federated_pull_error", { err: String(err) });
    }
  }

  function checkPackFreshness() {
    if (!enabled || !federatedState.lastPullAt) return;
    if (isPackStale()) {
      emitSiem("federated_pack_stale", {
        ageMs: Date.now() - federatedState.lastPullAt,
        pack_version: federatedState.current?.pack_version,
        action: stalePackAction,
      });
    }
  }

  async function maybeContribute(input) {
    if (!enabled || contributionMode === "disabled") return;
    try {
      const headers = { "Content-Type": "application/json" };
      if (sidecarAuth) headers.Authorization = `Bearer ${sidecarAuth}`;
      await fetch(contributionUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      });
    } catch (err) {
      log.warn("federated_contribute_failed", { err: String(err) });
    }
  }

  async function syncOutcomes() {
    if (!enabled || outcomes.length <= lastSyncedOutcomeIdx) return;
    const batch = outcomes.slice(lastSyncedOutcomeIdx, lastSyncedOutcomeIdx + outcomeSyncBatchSize);
    try {
      const headers = { "Content-Type": "application/json" };
      if (sidecarAuth) headers.Authorization = `Bearer ${sidecarAuth}`;
      const res = await fetch(outcomeSyncUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ outcomes: batch }),
      });
      if (res.ok) {
        lastSyncedOutcomeIdx += batch.length;
        log.info("context_loop_outcomes_synced", { count: batch.length });
      } else {
        log.warn("context_loop_outcomes_sync_failed", { status: res.status });
      }
    } catch (err) {
      log.warn("context_loop_outcomes_sync_error", { err: String(err) });
    }
  }

  function matchFederated(features, contentHash) {
    if (!federatedState.current) return null;
    return matchThreatSignatures(federatedState.current.signatures, features, contentHash);
  }

  function evaluatePreEnforce({
    sessionId,
    toolName,
    arguments: toolArgs,
    workloadId,
    namespace,
    pod,
    shadowMcp = false,
    entityCategories: entityCategoriesOverride,
  }) {
    if (!enabled) return { proceed: true };

    if (stalePackAction === "block" && isPackStale()) {
      emitSiem("federated_pack_stale", {
        action: "block",
        ageMs: Date.now() - federatedState.lastPullAt,
        pack_version: federatedState.current?.pack_version,
      });
      outcomes.push(
        labelOutcome({
          decision: "block",
          reason: "policy",
          confidence: 1,
          toolName,
          sessionId,
        })
      );
      return { proceed: false, reason: "federated_pack_stale", contaminationSource: "policy" };
    }

    const features = [];
    const argDetect = detectSuspiciousToolArgs(toolName, toolArgs);
    if (argDetect.suspicious) features.push(...argDetect.reasons);

    const resultDetect = detectSuspiciousToolResult(toolArgs);
    if (resultDetect.suspicious) features.push(...resultDetect.reasons, "tool_result_poison");

    const entityCategories = Array.isArray(entityCategoriesOverride)
      ? entityCategoriesOverride
      : [...features];

    const resolvedWorkloadId = resolveWorkloadId({ workloadId, shadowMcp });
    const ageMs = sessionAgeMs(sessionId);

    const contentHash = hashPattern(JSON.stringify({ toolName, features: argDetect.reasons }));
    const fedMatch = matchFederated(features, contentHash);

    let anomaly = 0;
    if (vectorStore) {
      const featureInput = {
        toolName,
        argKeySet: Object.keys(typeof toolArgs === "object" && toolArgs ? toolArgs : {}),
        entityCategories,
        sessionAgeMs: ageMs,
        workloadId: resolvedWorkloadId,
        contaminated: false,
        riskToolClass: toolName,
      };
      const embedding = embedContextFeatures(featureInput);
      const record = vectorStore.append(featureInput, embedding);
      const baseline = computeBaseline(vectorStore, record.features.workloadId, toolName);
      if (baseline?.centroid && record.embedding) {
        anomaly = anomalyScore(record.embedding, baseline);
      }
    }

    let contaminationSource = null;
    if (fedMatch) contaminationSource = "federated_sig";
    else if (resultDetect.suspicious) contaminationSource = "tool_result_detect";
    else if (argDetect.suspicious) contaminationSource = "auto_detect";
    else if (anomaly >= anomalyThreshold) contaminationSource = "anomaly";

    if (kernelRing && shouldCorrelateShellTool(toolName)) {
      const execMatch = kernelRing.findExecveMatch({ namespace, pod });
      if (execMatch) {
        lineage.append({
          id: `kexec-${Date.now()}`,
          sessionId,
          kind: "kernel_exec",
          toolName,
          detail: execMatch.comm,
        });
        if (!contaminationSource) contaminationSource = "ebpf_correlation";
        emitSiem("ebpf_correlation_match", { sessionId, toolName, comm: execMatch.comm });
      }
    }

    if (contaminationSource) {
      lineage.markContaminated(
        sessionId,
        `${contaminationSource}:${toolName}`,
        contaminationSource
      );
      emitSiem("auto_contaminate", { sessionId, toolName, source: contaminationSource, anomaly });
      if (fedMatch) {
        emitSiem("federated_sig_match", { sessionId, sigId: fedMatch.id, toolName });
        void maybeContribute({
          pattern_hash: fedMatch.pattern_hash,
          attack_class: fedMatch.class,
          tool_class: toolName,
          syntax_features: fedMatch.syntax_features,
          severity: fedMatch.severity,
          workspace_anon_id: process.env.BLEKLINE_WORKSPACE_ANON_ID?.trim() || "sidecar",
          observed_at: new Date().toISOString(),
        });
      }
      outcomes.push({
        ...labelOutcome({
          decision: "block",
          reason: contaminationSource === "federated_sig" ? "federated_sig" : contaminationSource === "anomaly" ? "anomaly" : contaminationSource === "tool_result_detect" ? "tool_result_detect" : "tool_arg_detect",
          confidence: fedMatch ? 0.95 : anomaly >= anomalyThreshold ? anomaly : 0.8,
          toolName,
          sessionId,
        }),
        ...(anomaly > 0 ? { anomalyScore: anomaly, driftScore: Math.max(0, anomaly - anomalyThreshold) } : {}),
      });
    } else if (anomaly > 0) {
      outcomes.push({
        ...labelOutcome({
          decision: "allow",
          reason: "policy",
          confidence: 1 - anomaly,
          toolName,
          sessionId,
        }),
        anomalyScore: anomaly,
        driftScore: Math.max(0, anomaly - anomalyThreshold * 0.5),
      });
    }

    return { proceed: true, fedMatch, anomaly, contaminationSource };
  }

  function ingestKernelEvent(body) {
    if (!enabled || !kernelRing) return;
    kernelRing.push({
      kind: typeof body.kind === "string" ? body.kind : "unknown",
      pid: Number(body.pid) || 0,
      comm: typeof body.comm === "string" ? body.comm : undefined,
      namespace: typeof body.namespace === "string" ? body.namespace : undefined,
      pod: typeof body.pod === "string" ? body.pod : undefined,
      source: typeof body.source === "string" ? body.source : "kernel-plane",
    });
  }

  function ingestLocalPack(raw) {
    if (!enabled) return { ok: false, error: "disabled" };
    const pub = resolvePublicKey();
    if (!pub) return { ok: false, error: "no_public_key" };
    const verified = verifyThreatPack(raw, pub);
    if (!verified.ok) return verified;
    federatedState.previous = federatedState.current;
    federatedState.current = verified.pack;
    federatedState.lastPullAt = Date.now();
    return { ok: true, pack: verified.pack };
  }

  function getStatus() {
    return {
      enabled,
      federated: {
        pack_version: federatedState.current?.pack_version ?? null,
        previous_pack_version: federatedState.previous?.pack_version ?? null,
        last_pull_at: federatedState.lastPullAt || null,
        signature_count: federatedState.current?.signatures?.length ?? 0,
        stale: isPackStale(),
        stale_action: stalePackAction,
      },
      context: vectorStore?.stats() ?? null,
      kernel: kernelRing?.stats() ?? null,
      outcomes: outcomes.length,
      outcomes_synced: lastSyncedOutcomeIdx,
    };
  }

  if (enabled) {
    void pullFederatedPack();
    setInterval(() => {
      void pullFederatedPack();
      checkPackFreshness();
    }, pullIntervalMs);
    setInterval(checkPackFreshness, 60_000);
    setInterval(() => {
      void syncOutcomes();
    }, outcomeSyncIntervalMs);
  }

  return {
    enabled,
    evaluatePreEnforce,
    ingestKernelEvent,
    ingestLocalPack,
    getStatus,
    pullFederatedPack,
    syncOutcomes,
    outcomes,
    vectorStore,
  };
}
