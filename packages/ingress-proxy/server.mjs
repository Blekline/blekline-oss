/**
 * OSS sidecar — contracts-only. Trust Vault and lineage ship in the NHIM Docker image.
 */
import http from "node:http";
import { warnClockSkewIfNeeded } from "./clock-skew.mjs";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { performance } from "node:perf_hooks";
import {
  scanTextForSecrets,
  enforceToolCallLocally,
  normalizeMcpToolPolicy,
  runLocalMaskPipeline,
} from "@blekline/contracts";

const log = {
  info(msg, detail) {
    console.log(`[blekline-sidecar] ${msg}`, detail ? JSON.stringify(detail) : "");
  },
  warn(msg, detail) {
    console.warn(`[blekline-sidecar] ${msg}`, detail ? JSON.stringify(detail) : "");
  },
  error(msg, detail) {
    console.error(`[blekline-sidecar] ${msg}`, detail ? JSON.stringify(detail) : "");
  },
};

const target = (process.env.BLEKLINE_INGRESS_TARGET || "https://app.blekline.com").replace(/\/$/, "");
const port = Number(process.env.LISTEN_PORT || 8787);
const listenHost = process.env.BLEKLINE_LISTEN_HOST || "127.0.0.1";
const region = process.env.BLEKLINE_INGRESS_REGION || "global";
const localMask = process.env.BLEKLINE_EDGE_LOCAL_MASK !== "false";
const maxBodyBytes = Number(process.env.BLEKLINE_MAX_BODY_BYTES || 1_048_576);
const sidecarAuth = process.env.BLEKLINE_SIDECAR_AUTH?.trim() || "";
const debugUpstream = process.env.BLEKLINE_DEBUG_UPSTREAM === "true";
const policyStreamUrl =
  process.env.BLEKLINE_POLICY_STREAM_URL ||
  `${target}/api/workspace/policy-stream`;

const NHIM_ONLY = {
  error: "Available in NHIM sidecar image (Trust Vault / lineage)",
  code: "NHIM_IMAGE_REQUIRED",
};

/** @type {{ revision: string | null; mcpToolPolicy: import('@blekline/contracts').McpToolPolicy | null }} */
const policyCache = { revision: null, mcpToolPolicy: null };

const routeMap = {
  "/v1/chat/completions": "/api/ingress/v1/chat/completions",
  "/v1/messages": "/api/ingress/v1/messages",
};

const metrics = {
  requests: 0,
  localMaskMs: [],
  upstreamMs: [],
  enforceCalls: 0,
};

const RESPONSE_HEADER_ALLOWLIST = new Set([
  "content-type",
  "cache-control",
  "x-request-id",
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
  "x-ratelimit-reset",
]);

const FORWARD_HEADER_ALLOWLIST = new Set([
  "authorization",
  "content-type",
  "accept",
  "x-request-id",
  "x-blekline-workspace-token",
  "x-blekline-workspace-id",
  "x-blekline-client-surface",
  "x-blekline-model-provider",
  "x-blekline-model-id",
]);

const enforceRate = { windowStart: Date.now(), count: 0 };
const ENFORCE_RATE_MAX = 60;
const ENFORCE_RATE_WINDOW_MS = 60_000;

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

function maskInline(text) {
  const t0 = performance.now();
  const validateIban = process.env.BLEKLINE_MASK_VALIDATE_IBAN === "true";
  const blockOnHighRiskMiss = process.env.BLEKLINE_MASK_BLOCK_HIGH_RISK !== "false";
  const result = runLocalMaskPipeline({
    text,
    validateIbanChecksum: validateIban,
    validateFinanceRegional: true,
    blockOnHighRiskMiss,
  });
  const ms = performance.now() - t0;
  metrics.localMaskMs.push(ms);
  if (metrics.localMaskMs.length > 500) metrics.localMaskMs.shift();
  if (blockOnHighRiskMiss && result.highRiskMiss.length > 0) {
    return {
      text: result.maskedText,
      entitiesMasked: result.entitiesMasked,
      ms,
      blocked: true,
      blockReason: "high_risk_literal_remaining",
    };
  }
  return { text: result.maskedText, entitiesMasked: result.entitiesMasked, ms, blocked: false };
}

function maskResponsePayload(path, payload) {
  if (!payload || typeof payload !== "object") return { payload, entitiesMasked: 0 };
  let entitiesMasked = 0;
  if (path === "/v1/chat/completions" && Array.isArray(payload.choices)) {
    for (const choice of payload.choices) {
      const content = choice?.message?.content;
      if (typeof content === "string") {
        const r = maskInline(content);
        choice.message.content = r.text;
        entitiesMasked += r.entitiesMasked;
      }
    }
  } else if (path === "/v1/messages" && Array.isArray(payload.content)) {
    for (const block of payload.content) {
      if (block?.type === "text" && typeof block.text === "string") {
        const r = maskInline(block.text);
        block.text = r.text;
        entitiesMasked += r.entitiesMasked;
      }
    }
  }
  return { payload, entitiesMasked };
}

function authOk(req) {
  if (!sidecarAuth) return false;
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return false;
  const token = h.slice(7);
  if (token.length !== sidecarAuth.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(sidecarAuth));
  } catch {
    return false;
  }
}

function requireAuth(req, res) {
  if (!sidecarAuth) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Sidecar auth not configured", code: "SIDECAR_AUTH_REQUIRED" }));
    return false;
  }
  if (!authOk(req)) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized", code: "SIDECAR_AUTH_FAILED" }));
    return false;
  }
  return true;
}

function checkEnforceRate(res) {
  const now = Date.now();
  if (now - enforceRate.windowStart > ENFORCE_RATE_WINDOW_MS) {
    enforceRate.windowStart = now;
    enforceRate.count = 0;
  }
  enforceRate.count += 1;
  if (enforceRate.count > ENFORCE_RATE_MAX) {
    res.writeHead(429, { "Content-Type": "application/json", "Retry-After": "60" });
    res.end(JSON.stringify({ error: "Too many enforce-tool-call requests" }));
    return false;
  }
  return true;
}

async function readBody(req, res) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBodyBytes) {
      res.writeHead(413, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Payload too large", maxBytes: maxBodyBytes }));
      return null;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function validateEnforceBody(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid payload" };
  const toolName = body.toolName;
  if (typeof toolName !== "string" || toolName.length < 1 || toolName.length > 120) {
    return { ok: false, error: "Invalid toolName" };
  }
  const args = body.arguments;
  if (args !== undefined && (typeof args !== "object" || args === null || Array.isArray(args))) {
    return { ok: false, error: "Invalid arguments" };
  }
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "default";
  return { ok: true, toolName, arguments: args ?? {}, sessionId };
}

function sanitizedUpstreamResponse(upstreamStatus, rawBody, errorId) {
  if (debugUpstream) {
    return {
      status: upstreamStatus,
      body: rawBody,
      contentType: "application/json",
    };
  }
  const clientStatus = upstreamStatus >= 500 ? 502 : upstreamStatus;
  return {
    status: clientStatus,
    body: JSON.stringify({
      error: "Upstream request failed",
      errorId,
      upstreamStatus,
    }),
    contentType: "application/json",
  };
}

function nhimOnly(res) {
  res.writeHead(503, { "Content-Type": "application/json" });
  res.end(JSON.stringify(NHIM_ONLY));
}

async function connectPolicyStream() {
  const token = process.env.BLEKLINE_WORKSPACE_TOKEN?.trim();
  if (!token) return;
  let backoffMs = 5000;
  const maxBackoff = 60_000;
  while (true) {
    try {
      const res = await fetch(policyStreamUrl, {
        headers: {
          "x-blekline-workspace-token": token,
          ...(process.env.BLEKLINE_WORKSPACE_ID
            ? { "x-blekline-workspace-id": process.env.BLEKLINE_WORKSPACE_ID }
            : {}),
        },
      });
      if (!res.ok || !res.body) {
        await new Promise((r) => setTimeout(r, backoffMs));
        backoffMs = Math.min(maxBackoff, backoffMs * 1.5 + Math.random() * 1000);
        continue;
      }
      backoffMs = 5000;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const chunk of parts) {
          const dataLine = chunk.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          try {
            const payload = JSON.parse(dataLine.slice(6));
            if (payload.mcpToolPolicy) {
              policyCache.mcpToolPolicy = normalizeMcpToolPolicy(payload.mcpToolPolicy);
              policyCache.revision = payload.revision ?? policyCache.revision;
            }
          } catch {
            /* ignore */
          }
        }
      }
    } catch (err) {
      log.warn("policy_stream_disconnected", { err: String(err) });
    }
    await new Promise((r) => setTimeout(r, backoffMs));
    backoffMs = Math.min(maxBackoff, backoffMs * 1.5 + Math.random() * 1000);
  }
}

void connectPolicyStream();

const server = http.createServer(async (req, res) => {
  const path = req.url?.split("?")[0] ?? "/";

  if (req.method === "GET" && path === "/health") {
    if (sidecarAuth && !authOk(req)) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized", code: "SIDECAR_AUTH_FAILED" }));
      return;
    }
    const local = [...metrics.localMaskMs].sort((a, b) => a - b);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        region,
        ...(sidecarAuth
          ? {}
          : {
              target,
              localMask,
              listenHost,
              oss: true,
              trustVault: false,
              lineage: false,
              policyRevision: policyCache.revision,
            }),
        latency: {
          localMaskP50Ms: percentile(local, 50).toFixed(2),
          localMaskP95Ms: percentile(local, 95).toFixed(2),
        },
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/enforce-tool-call") {
    if (!requireAuth(req, res)) return;
    if (!checkEnforceRate(res)) return;
    const raw = await readBody(req, res);
    if (raw === null) return;
    let body;
    try {
      body = JSON.parse(raw || "{}");
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }
    const validated = validateEnforceBody(body);
    if (!validated.ok) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: validated.error }));
      return;
    }
    metrics.enforceCalls += 1;
    const t0 = performance.now();

    let result;
    try {
      result = enforceToolCallLocally({
        toolName: validated.toolName,
        arguments: validated.arguments,
        requestId: `edge-${Date.now()}`,
        mcpToolPolicy: policyCache.mcpToolPolicy ?? undefined,
      });
    } catch (err) {
      log.error("enforce_failed", { err: String(err) });
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Enforcement failed", code: "ENFORCE_ERROR" }));
      return;
    }
    res.writeHead(200, {
      "Content-Type": "application/json",
      "x-blekline-ingress-region": region,
      "x-blekline-latency-ms": String(Math.round(performance.now() - t0)),
    });
    res.end(JSON.stringify(result));
    return;
  }

  if (
    req.method === "POST" &&
    (path === "/v1/vault/tokenize" ||
      path === "/v1/vault/hydrate" ||
      path === "/v1/lineage/contaminate")
  ) {
    if (!requireAuth(req, res)) return;
    nhimOnly(res);
    return;
  }

  const upstreamPath = routeMap[path];
  if (upstreamPath && req.method === "POST") {
    if (!requireAuth(req, res)) return;
  }
  if (!upstreamPath || req.method !== "POST") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "Not found",
        routes: [
          "POST /v1/chat/completions",
          "POST /v1/messages",
          "POST /v1/enforce-tool-call",
          "POST /v1/vault/tokenize",
          "POST /v1/vault/hydrate",
          "POST /v1/lineage/contaminate",
          "GET /health",
        ],
      })
    );
    return;
  }

  metrics.requests += 1;
  const bodyStrRaw = await readBody(req, res);
  if (bodyStrRaw === null) return;
  let bodyStr = bodyStrRaw;

  if (localMask) {
    try {
      const parsed = JSON.parse(bodyStr);
      const messages = Array.isArray(parsed.messages) ? parsed.messages : [];
      for (const msg of messages) {
        if (typeof msg.content === "string" && (msg.role === "user" || msg.role === "system")) {
          msg.content = maskInline(msg.content).text;
        }
      }
      bodyStr = JSON.stringify(parsed);
    } catch {
      /* forward raw */
    }
  }

  const headers = { host: new URL(target).host };
  for (const [k, v] of Object.entries(req.headers)) {
    const lower = k.toLowerCase();
    if (FORWARD_HEADER_ALLOWLIST.has(lower) && typeof v === "string") {
      headers[lower] = v;
    }
  }
  delete headers["content-length"];
  headers["x-blekline-ingress-region"] = region;

  const t0 = performance.now();
  const errorId = randomUUID();
  try {
    const upstream = await fetch(`${target}${upstreamPath}`, {
      method: "POST",
      headers,
      body: bodyStr,
    });
    const ms = performance.now() - t0;
    metrics.upstreamMs.push(ms);
    if (metrics.upstreamMs.length > 200) metrics.upstreamMs.shift();
    let outText = await upstream.text();
    if (!upstream.ok) {
      log.error("upstream_error", {
        errorId,
        upstreamStatus: upstream.status,
        ...(debugUpstream ? { detail: outText.slice(0, 2048) } : {}),
      });
      const sanitized = sanitizedUpstreamResponse(upstream.status, outText, errorId);
      res.writeHead(sanitized.status, {
        "Content-Type": sanitized.contentType,
        "x-blekline-ingress-region": region,
        "x-blekline-edge-upstream-ms": String(Math.round(ms)),
        "x-blekline-error-id": errorId,
      });
      res.end(sanitized.body);
      return;
    }
    if (localMask) {
      try {
        const parsed = JSON.parse(outText);
        const masked = maskResponsePayload(path, parsed);
        if (masked.entitiesMasked > 0) {
          outText = JSON.stringify(masked.payload);
        }
      } catch {
        /* pass through */
      }
    }
    const responseHeaders = {
      "x-blekline-ingress-region": region,
      "x-blekline-edge-upstream-ms": String(Math.round(ms)),
    };
    for (const [k, v] of upstream.headers.entries()) {
      if (RESPONSE_HEADER_ALLOWLIST.has(k.toLowerCase())) {
        responseHeaders[k] = v;
      }
    }
    res.writeHead(upstream.status, responseHeaders);
    res.end(outText);
  } catch (err) {
    log.error("upstream_failed", { errorId, err: String(err) });
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Upstream failed", errorId }));
  }
});

server.listen(port, listenHost, async () => {
  await warnClockSkewIfNeeded({ target, log });

  log.info("sidecar_listening", {
    region,
    port,
    listenHost,
    target,
    localMask,
    sidecarAuthConfigured: !!sidecarAuth,
    oss: true,
  });
});
