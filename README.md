&nbsp;

<div align="center">
  <picture>
    <source
      media="(prefers-color-scheme: dark)"
      srcset="https://github.com/Blekline/blekline-oss/raw/main/assets/images/blekline-logo-dark.svg"
    />
    <source
      media="(prefers-color-scheme: light)"
      srcset="https://github.com/Blekline/blekline-oss/raw/main/assets/images/blekline-logo-light.svg"
    />
    <img
      alt="Blekline — mark and wordmark"
      src="https://github.com/Blekline/blekline-oss/raw/main/assets/images/blekline-logo-light.svg"
      width="46%"
    />
  </picture>
</div>

<h3 align="center">
  AI ingress control plane to Run Secure AI Agents and Code
  <br />
  <sub>Mask, enforce, and audit every agent call - before it reaches your LLMs, tools, and Daytona sandboxes.</sub>
</h3>

<p align="center">
  <a href="https://app.blekline.com/docs/">Documentation</a> ·
  <a href="https://app.blekline.com/docs/introduction/architecture">Architecture</a> ·
  <a href="">Report Bug</a> ·
  <a href="">Request Feature</a> ·
  <a href="https://app.blekline.com">Cloud</a>
</p>

<p align="center">
  <a href="https://github.com/Blekline/blekline-oss/actions/workflows/oss-ci.yml"><img src="https://github.com/Blekline/blekline-oss/actions/workflows/oss-ci.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/Proxy%20%26%20server-AGPL%20v3-blue.svg" alt="AGPL v3" /></a>
  <a href="LICENSE-APACHE"><img src="https://img.shields.io/badge/SDK%20%26%20contracts-Apache%202.0-green.svg" alt="Apache-2.0" /></a>
  <a href="https://www.npmjs.com/package/@blekline/mcp-server"><img src="https://img.shields.io/npm/v/@blekline/mcp-server?label=mcp-server" alt="npm" /></a>
  <a href="https://www.npmjs.com/package/@blekline/mcp-proxy"><img src="https://img.shields.io/npm/v/@blekline/mcp-proxy?label=mcp-proxy" alt="npm proxy" /></a>
</p>

---

**Blekline is an open-core MCP ingress control plane** — infrastructure that sits between your agents and everything they can touch.
It does three things, in real time, before any LLM sees a prompt or any tool executes:

**Mask** — strip PII, secrets, and sensitive context from prompts before they hit model APIs (MCP Server)

**Enforce** — evaluate tool calls against policy; allow, flag, or block before execution

**Audit** — emit a structured, tamper-evident event trail for every agent interaction

You can run it locally in two minutes. You can deploy it as a sidecar inside a Daytona sandbox. You can plug it into Cursor, Claude Desktop, or Codex today, without changing your agent code.

This is the infrastructure that makes governed AI deployment real: not a checkbox, not a policy document, but a running system that enforces your intentions at the call level.

## Try in 2 minutes

```bash
export BLEKLINE_WORKSPACE_TOKEN="blw_..."   # Admin → API keys @ app.blekline.com
export BLEKLINE_API_URL="https://app.blekline.com"
npx -y @blekline/mcp-server
```

**Cursor** — `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "blekline": {
      "command": "npx",
      "args": ["-y", "@blekline/mcp-server"],
      "env": {
        "BLEKLINE_WORKSPACE_TOKEN": "blw_...",
        "BLEKLINE_CLIENT_SURFACE": "cursor"
      }
    }
  }
}
```

In the agent: *"Use blekline_mask_prompt on: Contact Jane at jane@acme.com — API key AKIAIOSFODNN7EXAMPLE"*

**Proxy + Daytona** — point downstream MCP at your sandbox; see [Daytona stack](docs/integrations/daytona-stack.md).

**No cloud (local dev)** — `@blekline/contracts` secret scan + `enforceToolCallLocally` (see [Local-only](#local-only-no-api-token) below).

## Architecture

```mermaid
flowchart LR
  subgraph L5["Layer 5 — Agents"]
    A[Cursor / Claude / Codex]
  end
  subgraph L4["Layer 4 — Blekline"]
    S[mcp-server]
    P[mcp-proxy]
    API[mask · enforce · audit]
  end
  subgraph L3["Layer 3 — Runtime"]
    D[Daytona sandbox]
  end
  subgraph L2["Layer 2 — Models"]
    M[LLM APIs]
  end
  A --> S
  A --> P
  P --> S
  S --> API
  P --> API
  API --> M
  P --> D
```

[Full architecture](docs/introduction/architecture.md) · [Why ingress](docs/introduction/why-ingress.md) · [Trust boundaries](docs/security/trust-boundaries.md) · [Latency SLO](docs/reference/latency-slo.md)

## Open core vs cloud

| Capability | OSS (this repo) | Cloud ([app.blekline.com](https://app.blekline.com)) |
|------------|-----------------|------------------------------------------------------|
| MCP server / proxy | Yes | Yes |
| Local tool + secret enforce | Yes (`@blekline/contracts`) | Yes |
| Azure authoritative PII mask | — | Yes |
| Workspace fleet policy (SSE) | — | Yes |
| Investigations / billing | — | Yes |

**License:** AGPL for proxy/server (self-host or buy cloud). Apache for contracts/SDK (embed in your agent stack).

## Packages

| Package | Install | License |
|---------|---------|---------|
| `@blekline/mcp-server` | `npm i @blekline/mcp-server` | AGPL-3.0 |
| `@blekline/mcp-proxy` | `npm i @blekline/mcp-proxy` | AGPL-3.0 |
| `@blekline/client` | `npm i @blekline/client` | Apache-2.0 |
| `@blekline/contracts` | workspace / embed | Apache-2.0 |
| `ingress-proxy` | Docker / Helm | AGPL-3.0 |

OpenAPI: [`packages/contracts/openapi.yaml`](packages/contracts/openapi.yaml)

## MCP tools

| Tool | Purpose |
|------|---------|
| `blekline_mask_prompt` | Redact PII / secrets before model context |
| `blekline_classify_risk` | Risk tier → allow / review / block |
| `blekline_evaluate_tool_call` | Policy on tool name + arguments |
| `blekline_emit_event` | Metadata audit trail |

Proxy path: agent → **Blekline** → allow/mask/block → downstream MCP (Daytona, custom).

## Client libraries

### TypeScript

```bash
npm install @blekline/client
```

```typescript
import { BleklineClient } from "@blekline/client";

const blekline = new BleklineClient({
  workspaceToken: process.env.BLEKLINE_WORKSPACE_TOKEN!,
  metadata: { clientSurface: "sdk" },
});

await blekline.mask({ text: "alice@corp.com", platform: "MyAgent" });
await blekline.enforceToolCall({
  toolName: "run_shell",
  arguments: { cmd: "curl https://api.internal/deploy" },
});
```

### Python

```bash
pip install blekline-client
```

### Local-only (no API token)

```typescript
import { enforceToolCallLocally, scanTextForSecrets } from "@blekline/contracts";

scanTextForSecrets("export AWS_KEY=AKIAIOSFODNN7EXAMPLE");
enforceToolCallLocally({
  toolName: "run_shell",
  arguments: { cmd: "export AWS_KEY=AKIAIOSFODNN7EXAMPLE" },
  requestId: "local-1",
});
```

## Deploy

| Mode | Command / link |
|------|----------------|
| MCP (global) | `npx -y @blekline/mcp-server` |
| Edge sidecar | `pnpm docker:ingress` — [Helm](docs/api/ingress-proxy.md) |
| Daytona | [Integration guide](docs/integrations/daytona-stack.md) |

## Development

Client demos and smoke tests: [demo/README.md](demo/README.md).

```bash
git clone https://github.com/Blekline/blekline-oss.git && cd blekline-oss
pnpm install && pnpm build:packages && pnpm demo:mcp-smoke
```

## Documentation

| Doc | Topic |
|-----|--------|
| [Quick start](docs/introduction/quick-start.md) | Token, first mask |
| [Why ingress](docs/introduction/why-ingress.md) | Layer 4 vs Layer 5 |
| [MCP proxy](docs/mcp/proxy.md) | Downstream governance |
| [MCP identity pinning](docs/security/mcp-identity-pinning.md) | Server attestation |
| [Cursor / Claude / Codex](docs/mcp/cursor.md) | Client configs |

## Contributing

[CONTRIBUTING.md](CONTRIBUTING.md) · [SECURITY.md](SECURITY.md) · [CHANGELOG.md](CHANGELOG.md)

Private Blekline team: develop in the `blekline` monorepo, run `pnpm sync:oss` from the root repo.

## License

| Component | License |
|-----------|---------|
| `mcp-server`, `mcp-proxy`, `ingress-proxy` | [AGPL-3.0](LICENSE) |
| `contracts`, `client`, `client-python` | [Apache-2.0](LICENSE-APACHE) |

Managed SaaS at [app.blekline.com](https://app.blekline.com) is not licensed under this repository.
