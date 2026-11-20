# @blekline/contracts

Shared types, Zod schemas, secret patterns, local MCP tool enforcement, and execution routing helpers for Blekline clients.

## Exports

- `maskRequestSchema`, `MaskResponse`
- `eventIngestSchema`, `EventIngest`
- `enforceToolCallRequestSchema`, `enforceToolCallLocally`
- `McpToolPolicy`, `resolveMcpToolPolicyDecision`
- `scanTextForSecrets`, `BLEKLINE_HEADERS`

## OpenAPI

Machine-readable API spec: [`openapi.yaml`](./openapi.yaml)

## Build

```bash
pnpm --filter @blekline/contracts build
```

## Docs

- [OpenAPI](https://app.blekline.com/docs/api/openapi)
- [Architecture](https://app.blekline.com/docs/introduction/architecture)
- [Workflows and runs](https://app.blekline.com/docs/workflows-and-runs)
- [SDK client](https://app.blekline.com/docs/sdk-client)
