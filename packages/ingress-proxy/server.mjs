import http from "node:http";
import { performance } from "node:perf_hooks";
import { scanTextForSecrets } from "@blekline/contracts/dist/secret-patterns.js";
import { enforceToolCallLocally } from "@blekline/contracts/dist/enforce-local.js";

const target = (process.env.BLEKLINE_INGRESS_TARGET || "https://app.blekline.com").replace(/\/$/, "");
const port = Number(process.env.LISTEN_PORT || 8787);
const region = process.env.BLEKLINE_INGRESS_REGION || "global";
const localMask = process.env.BLEKLINE_EDGE_LOCAL_MASK !== "false";
const policyStreamUrl =
  process.env.BLEKLINE_POLICY_STREAM_URL ||
  `${target}/api/workspace/policy-stream`;

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
};

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

function maskInline(text) {
  const t0 = performance.now();
  const findings = scanTextForSecrets(text);
  let out = text;
  for (const f of [...findings].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, f.start) + `[${f.label}]` + out.slice(f.end);
  }
  const ms = performance.now() - t0;
  metrics.localMaskMs.push(ms);
  if (metrics.localMaskMs.length > 500) metrics.localMaskMs.shift();
  return { text: out, entitiesMasked: findings.length, ms };
}

async function connectPolicyStream() {
  const token = process.env.BLEKLINE_WORKSPACE_TOKEN?.trim();
  if (!token) return;
  try {
    const res = await fetch(policyStreamUrl, {
      headers: {
        "x-blekline-workspace-token": token,
        ...(process.env.BLEKLINE_WORKSPACE_ID
          ? { "x-blekline-workspace-id": process.env.BLEKLINE_WORKSPACE_ID }
          : {}),
      },
    });
    if (!res.ok || !res.body) return;
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
            policyCache.mcpToolPolicy = payload.mcpToolPolicy;
            policyCache.revision = payload.revision ?? policyCache.revision;
          }
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    setTimeout(connectPolicyStream, 5000);
  }
}

void connectPolicyStream();

const server = http.createServer(async (req, res) => {
  const path = req.url?.split("?")[0] ?? "/";

  if (req.method === "GET" && path === "/health") {
    const local = [...metrics.localMaskMs].sort((a, b) => a - b);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        region,
        target,
        localMask,
        policyRevision: policyCache.revision,
        latency: {
          localMaskP50Ms: percentile(local, 50).toFixed(2),
          localMaskP95Ms: percentile(local, 95).toFixed(2),
        },
      })
    );
    return;
  }

  if (req.method === "POST" && path === "/v1/enforce-tool-call") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    const t0 = performance.now();
    const result = enforceToolCallLocally({
      toolName: String(body.toolName ?? ""),
      arguments: body.arguments && typeof body.arguments === "object" ? body.arguments : {},
      requestId: `edge-${Date.now()}`,
      mcpToolPolicy: policyCache.mcpToolPolicy ?? undefined,
    });
    res.writeHead(200, {
      "Content-Type": "application/json",
      "x-blekline-ingress-region": region,
      "x-blekline-latency-ms": String(Math.round(performance.now() - t0)),
    });
    res.end(JSON.stringify(result));
    return;
  }

  const upstreamPath = routeMap[path];
  if (!upstreamPath || req.method !== "POST") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "Not found",
        routes: ["POST /v1/chat/completions", "POST /v1/messages", "POST /v1/enforce-tool-call", "GET /health"],
      })
    );
    return;
  }

  metrics.requests += 1;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  let bodyStr = Buffer.concat(chunks).toString("utf8");

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

  const headers = { ...req.headers, host: new URL(target).host };
  delete headers["content-length"];
  headers["x-blekline-ingress-region"] = region;

  const t0 = performance.now();
  try {
    const upstream = await fetch(`${target}${upstreamPath}`, {
      method: "POST",
      headers,
      body: bodyStr,
    });
    const ms = performance.now() - t0;
    metrics.upstreamMs.push(ms);
    if (metrics.upstreamMs.length > 200) metrics.upstreamMs.shift();
    const text = await upstream.text();
    res.writeHead(upstream.status, {
      ...Object.fromEntries(upstream.headers.entries()),
      "x-blekline-ingress-region": region,
      "x-blekline-edge-upstream-ms": String(Math.round(ms)),
    });
    res.end(text);
  } catch (err) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Upstream failed", detail: String(err) }));
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`[blekline-ingress] region=${region} port=${port} target=${target} localMask=${localMask}`);
});
