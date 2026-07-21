<!-- GitHub repo About field: Non-Human Identity & Runtime Enforcement for AI agents — open-core MCP/SDK to mask, enforce, and audit agent calls. -->

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
  Non-Human Identity &amp; Runtime Enforcement for AI agents — open-core MCP/SDK to mask, enforce, and audit every agent call.
</h3>

<p align="center">
  <a href="https://app.blekline.com/playground">Runtime Simulator</a> ·
  <a href="https://app.blekline.com/definitions">Definitions</a> ·
  <a href="https://app.blekline.com/docs/introduction/nhim">NHIM</a> ·
  <a href="https://app.blekline.com/docs/introduction/quick-start">Quick start</a> ·
  <a href="https://app.blekline.com/docs/introduction/why-ingress">Why ingress</a> ·
  <a href="https://app.blekline.com/docs/introduction/architecture">Architecture</a> ·
  <a href="https://app.blekline.com/docs/mcp/server">MCP Server</a> ·
  <a href="SECURITY.md">Security</a> ·
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

## The problem nobody wants to talk about

Cursor writes your code, Claude answers your support tickets, autonomous pipelines touch your databases, your APIs, your customers' data. The ecosystem is accelerating — MCP servers let agents pick up tools like apps pick up plugins — and that is genuinely exciting.

But here's the thing: your agents have no idea what they're not allowed to do. They'll happily pass an AWS key to a model context window. They'll call a tool with a customer's email as an argument. They'll execute a shell command that wasn't in the plan. Not out of malice — out of the fundamental nature of language models: they optimize for task completion, not for the organizational policies you haven't written yet.

This is the AI governance gap. And right now, there's nothing sitting between your agents and everything they can touch.

## Why this is becoming urgent

The EU AI Act isn't theoretical anymore. GPAI obligations have been enforceable since August 2025. Transparency and human oversight requirements land in August 2026. High-risk system conformity assessments follow. Fines reach up to €35 million or 7% of global turnover for the worst violations. And these rules aren't just about the models — they're about the systems you build with them: how you govern tool access, how you audit decisions, how you prove a human was in the loop.

Meanwhile, enterprises running AI at scale — sandboxed, parallelized, thousands of agent calls — have no native answer for: what happened in that session? Who authorized that tool call? Did any PII leave the context window?

The compliance question is catching up to the capability question. And most teams aren't ready.

## What Blekline is

Blekline is an **open-core NHIM wedge** — MCP/SDK/ingress sidecar for mask, enforce, and audit at the agent boundary.


| Open source (this repo)                                    | Private (enterprise image)                  |
| ---------------------------------------------------------- | ------------------------------------------- |
| `@blekline/mcp-server`, `mcp-proxy`, `contracts`, `client` | Trust Vault (stateful tokenization)         |
| `ingress-proxy` sidecar shell + Helm                       | Lineage Firewall engine                     |
| Cursor hooks                                               | `runtime-engine` crypto + admission webhook |


It does three things, in real time, before any LLM sees a prompt or any tool executes:

**Mask** — strip PII, secrets, and sensitive context from prompts before they hit model APIs ([MCP Server docs](https://app.blekline.com/docs/mcp/server))

**Enforce** — evaluate tool calls against policy; allow, flag, or block before execution

**Audit** — emit a structured, tamper-evident event trail for every agent interaction

You can run it locally in two minutes. You can deploy it as a sidecar alongside any L1 sandbox (Daytona, Modal, E2B, Cloudflare, Vercel Sandbox). You can plug it into Cursor, Claude Desktop, or Codex today — without changing your agent code.

This is the infrastructure that makes governed AI deployment real: not a checkbox, not a policy document, but a running system that enforces your intentions at the call level.

---

## Start here

```bash
pnpm install && pnpm build:packages
export BLEKLINE_WORKSPACE_TOKEN="blw_..."
export BLEKLINE_API_URL="https://app.blekline.com"
export BLEKLINE_CLIENT_SURFACE="sdk"
pnpm demo:mcp-smoke
```

Headless guide: `[cli/README.md](cli/README.md)` · CI template: `[ci/](ci/)`

## Connect Blekline


| Surface        | Path                                                                                     | `BLEKLINE_CLIENT_SURFACE` |
| -------------- | ---------------------------------------------------------------------------------------- | ------------------------- |
| CLI / SDK      | `[cli/](cli/)`                                                                           | `sdk`                     |
| CI / CD        | `[ci/](ci/)`                                                                             | `sdk`                     |
| Claude Code    | `[.claude/settings.json.example](.claude/settings.json.example)`                         | `claude-code`             |
| Cursor         | `[.cursor/mcp.json.example](.cursor/mcp.json.example)`                                   | `cursor`                  |
| GitHub Copilot | `[.vscode/mcp.json.example](.vscode/mcp.json.example)`                                   | `github-copilot`          |
| Continue       | `[.vscode/continue.config.json.example](.vscode/continue.config.json.example)`           | `continue`                |
| Claude Desktop | `[config/claude_desktop_config.json.example](config/claude_desktop_config.json.example)` | `claude-desktop`          |
| Codex          | `[.codex/config.toml.example](.codex/config.toml.example)`                               | `codex`                   |


Full index: `[integrations/README.md](integrations/README.md)` · Docs: [app.blekline.com/docs](https://app.blekline.com/docs)

```bash
pnpm generate:mcp-configs          # *.example configs
pnpm verify:integrations           # manifest + schema checks
```

In any client: *"Use blekline_mask_prompt on: Contact Jane at [jane@acme.com](mailto:jane@acme.com) — API key AKIAIOSFODNN7EXAMPLE"*

## Architecture

Blekline sits at **Layer 4** — between L5 agents (Cursor, Claude, Codex) and L1 sandboxes (Daytona, Modal, Vercel Sandbox, Cloudflare, E2B) and model APIs.

```mermaid
flowchart LR
  L5[L5 Agents] --> L4[Blekline L4<br/>mask · enforce · audit]
  L4 --> L1[L1 sandboxes / MCP]
  L4 --> Models[Model APIs]
  L4 --> Vault[Trust Vault VPC]
```

Try it interactively: **[Runtime Simulator](https://app.blekline.com/playground)** · [NHIM docs](https://app.blekline.com/docs/introduction/nhim) · [Definitions](https://app.blekline.com/definitions)

[AI Enablement Stack](https://app.blekline.com/docs/introduction/ai-enablement-stack) · [Architecture](https://app.blekline.com/docs/introduction/architecture) · [Trust boundaries](https://app.blekline.com/docs/security/trust-boundaries) · [Latency SLO](https://app.blekline.com/docs/reference/latency-slo)

## Open core vs cloud


| Capability                   | OSS (this repo)             | Cloud ([app.blekline.com](https://app.blekline.com)) |
| ---------------------------- | --------------------------- | ---------------------------------------------------- |
| MCP server / proxy           | Yes                         | Yes                                                  |
| Local tool + secret enforce  | Yes (`@blekline/contracts`) | Yes                                                  |
| Azure authoritative PII mask | —                           | Yes                                                  |
| Workspace fleet policy (SSE) | —                           | Yes                                                  |
| Investigations / billing     | —                           | Yes                                                  |


**License:** AGPL for proxy/server (self-host or buy cloud). Apache for contracts/SDK (embed in your agent stack).

## Who this is for

**Developers** building with Cursor, Claude Desktop, or Codex who want their agents to stop leaking secrets and start respecting tool boundaries.

**Platform teams** deploying AI workloads in L1 sandboxes who need a governance layer that travels with the execution environment.

**Enterprise architects** preparing for EU AI Act compliance — specifically human oversight, audit trails, and tool call transparency requirements that become enforceable in August 2026.

**Open source contributors** who believe that the infrastructure for safe AI should be auditable, forkable, and owned by the community — not locked inside a vendor's cloud.

## Packages


| Package                | Install                      | License    |
| ---------------------- | ---------------------------- | ---------- |
| `@blekline/mcp-server` | `npm i @blekline/mcp-server` | AGPL-3.0   |
| `@blekline/mcp-proxy`  | `npm i @blekline/mcp-proxy`  | AGPL-3.0   |
| `@blekline/client`     | `npm i @blekline/client`     | Apache-2.0 |
| `@blekline/contracts`  | workspace / embed            | Apache-2.0 |
| `ingress-proxy`        | Docker / Helm                | AGPL-3.0   |


OpenAPI: `[packages/contracts/openapi.yaml](packages/contracts/openapi.yaml)`

## MCP tools


| Tool                          | Purpose                                   |
| ----------------------------- | ----------------------------------------- |
| `blekline_mask_prompt`        | Redact PII / secrets before model context |
| `blekline_classify_risk`      | Risk tier → allow / review / block        |
| `blekline_evaluate_tool_call` | Policy on tool name + arguments           |
| `blekline_emit_event`         | Metadata audit trail                      |


Proxy path: agent → **Blekline** → allow/mask/block → downstream MCP (Daytona, E2B, Modal, Cloudflare, Vercel Sandbox, custom).

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

## Works with

Full integration guides on [app.blekline.com/docs](https://app.blekline.com/docs) — not mirrored in this repo.

### L5 agent clients


| Client           | Guide                                                                     |
| ---------------- | ------------------------------------------------------------------------- |
| Hub              | [Agent clients](https://app.blekline.com/docs/integrations/agent-clients) |
| Continue         | [Continue MCP](https://app.blekline.com/docs/mcp/continue)                |
| GitHub Copilot   | [Copilot MCP](https://app.blekline.com/docs/mcp/github-copilot)           |
| OpenHands        | [OpenHands](https://app.blekline.com/docs/mcp/openhands)                  |
| Sourcegraph Cody | [Cody](https://app.blekline.com/docs/mcp/sourcegraph-cody)                |


### L2 model providers


| Provider     | Guide                                                                           |
| ------------ | ------------------------------------------------------------------------------- |
| Hub          | [Model providers](https://app.blekline.com/docs/integrations/model-providers)   |
| Azure OpenAI | [Azure stack](https://app.blekline.com/docs/integrations/azure-openai-stack)    |
| AWS Bedrock  | [Bedrock stack](https://app.blekline.com/docs/integrations/aws-bedrock-stack)   |
| OpenRouter   | [OpenRouter stack](https://app.blekline.com/docs/integrations/openrouter-stack) |


### L2 frameworks & RAG


| Integration | Guide                                                                             |
| ----------- | --------------------------------------------------------------------------------- |
| Hub         | [Frameworks & RAG](https://app.blekline.com/docs/integrations/frameworks-and-rag) |
| LangChain   | [LangChain stack](https://app.blekline.com/docs/integrations/langchain-stack)     |
| Pinecone    | [Pinecone stack](https://app.blekline.com/docs/integrations/pinecone-stack)       |


### L3 eval & safety


| Partner    | Guide                                                                           |
| ---------- | ------------------------------------------------------------------------------- |
| Hub        | [Eval & safety](https://app.blekline.com/docs/integrations/eval-and-safety)     |
| LangSmith  | [LangSmith stack](https://app.blekline.com/docs/integrations/langsmith-stack)   |
| Guardrails | [Guardrails stack](https://app.blekline.com/docs/integrations/guardrails-stack) |


### L1 sandboxes


| Provider       | Integration guide                                                                       |
| -------------- | --------------------------------------------------------------------------------------- |
| All five       | [Sandbox providers hub](https://app.blekline.com/docs/integrations/sandbox-providers)   |
| Daytona        | [Daytona stack](https://app.blekline.com/docs/integrations/daytona-stack)               |
| Modal          | [Modal stack](https://app.blekline.com/docs/integrations/modal-stack)                   |
| Vercel Sandbox | [Vercel Sandbox stack](https://app.blekline.com/docs/integrations/vercel-sandbox-stack) |
| Cloudflare     | [Cloudflare stack](https://app.blekline.com/docs/integrations/cloudflare-stack)         |
| E2B            | [E2B stack](https://app.blekline.com/docs/integrations/e2b-stack)                       |


## Deploy


| Mode         | Command / link                                                                    |
| ------------ | --------------------------------------------------------------------------------- |
| MCP (global) | `npx -y @blekline/mcp-server`                                                     |
| Edge sidecar | `pnpm docker:ingress` — [Helm](https://app.blekline.com/docs/api/ingress-proxy)   |
| L1 sandboxes | [Sandbox providers](https://app.blekline.com/docs/integrations/sandbox-providers) |


## Development

Client demos and smoke tests: [demo/README.md](demo/README.md).

```bash
git clone https://github.com/Blekline/blekline-oss.git && cd blekline-oss
pnpm install && pnpm build:packages && pnpm demo:mcp-smoke
```

## Documentation

All docs: **[app.blekline.com/docs](https://app.blekline.com/docs)**


| Doc                    | Link                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| Quick start            | [introduction/quick-start](https://app.blekline.com/docs/introduction/quick-start)                 |
| EU AI Act & compliance | [introduction/eu-ai-act](https://app.blekline.com/docs/introduction/eu-ai-act)                     |
| AI Enablement Stack    | [introduction/ai-enablement-stack](https://app.blekline.com/docs/introduction/ai-enablement-stack) |
| MCP proxy              | [mcp/proxy](https://app.blekline.com/docs/mcp/proxy)                                               |
| Cursor setup           | [mcp/cursor](https://app.blekline.com/docs/mcp/cursor)                                             |


## Community & design partners

**Questions or integration feedback** — [GitHub Discussions](https://github.com/Blekline/blekline-oss/discussions) (Q&A, integration feedback).

**Design partners** — shipping agents in production and want help wiring Blekline into your stack (proxy or MCP server)?

- [Open a design partner issue](https://github.com/Blekline/blekline-oss/issues/new?template=design_partner.yml)
- Or [start a discussion](https://github.com/Blekline/blekline-oss/discussions/new) — choose **Design partner interest**

## Contributing

[CONTRIBUTING.md](CONTRIBUTING.md) · [SECURITY.md](SECURITY.md) · [CHANGELOG.md](CHANGELOG.md)

Private Blekline team: develop in the `blekline` monorepo, run `pnpm sync:oss` from the root repo.

## License


| Component                                  | License                      |
| ------------------------------------------ | ---------------------------- |
| `mcp-server`, `mcp-proxy`, `ingress-proxy` | [AGPL-3.0](LICENSE)          |
| `contracts`, `client`, `client-python`     | [Apache-2.0](LICENSE-APACHE) |


Managed SaaS at [app.blekline.com](https://app.blekline.com) is not licensed under this repository.