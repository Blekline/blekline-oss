# @blekline/contracts

Shared types, Zod schemas, secret patterns, and local MCP tool enforcement for the Blekline ingress platform.

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
