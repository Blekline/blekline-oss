# Blekline CI / CD

Gate agent tool calls in pipelines before they reach production APIs.

## GitHub Actions

Copy [`github-actions/blekline-gate.yml.example`](github-actions/blekline-gate.yml.example) to `.github/workflows/blekline-gate.yml` and set repository secrets:

- `BLEKLINE_WORKSPACE_TOKEN` — workspace API key (`blw_...`)
- `BLEKLINE_API_URL` — `https://app.blekline.com` (or self-hosted ingress)

## Local verify

```bash
pnpm build:packages
pnpm verify:integrations
```

Docs: [CI/CD guide](https://app.blekline.com/docs/sdk/ci-cd)
