# OpenAPI

Blekline publishes an OpenAPI 3.1 spec at `packages/contracts/openapi.yaml` in the monorepo.

## Covered endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/mask` | Mask prompts |
| POST | `/api/events` | Metadata event ingest |
| POST | `/api/mcp/enforce-tool-call` | MCP tool-call governance |
| POST | `/api/policy/simulate` | Policy simulation |
| GET/POST | `/api/workspace/mcp-policy` | Workspace MCP tool allow/deny |
| POST | `/api/ingress/v1/chat/completions` | OpenAI-compatible ingress proxy |
| POST | `/api/ingress/v1/messages` | Anthropic Messages ingress proxy |

## Auth

All endpoints accept `x-blekline-workspace-token` (scoped API token). Dashboard sessions use bearer cookies via the same routes where applicable.

Optional headers for fleet telemetry:

- `x-blekline-client-surface` — `cursor`, `claude-desktop`, `codex`, `sdk`, `extension`
- `x-blekline-model-provider` — model vendor
- `x-blekline-model-id` — model id string

## Generate clients

Import the YAML into Postman, Insomnia, or `openapi-generator` for Java/Go/Rust clients. Official SDKs: `@blekline/client` (TypeScript) and `blekline-client` (Python).
