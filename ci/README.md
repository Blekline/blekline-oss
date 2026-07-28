# Blekline CI / CD

Gate agent tool calls in pipelines before they reach production APIs.

## GitHub Actions

Copy [`github-actions/blekline-gate.yml.example`](github-actions/blekline-gate.yml.example) to `.github/workflows/blekline-gate.yml` and set repository secrets:

- `BLEKLINE_WORKSPACE_TOKEN` — workspace API key (`blw_...`)
- `BLEKLINE_API_URL` — `https://app.blekline.com` (or self-hosted ingress)

### NHIM Audit (K8s agent-hop gate)

Merge-blocking static audit — no workspace token:

```yaml
- uses: ./ci/github-actions/nhim-audit
  with:
    kubeconfig: ${{ secrets.KUBECONFIG }}
    fail-on: high
    min-score: "75"
    output: nhim-audit.json
- uses: actions/upload-artifact@v4
  with:
    name: nhim-audit-report
    path: nhim-audit.json
```

SARIF: set `format: sarif` and `output: nhim-audit.sarif`. Pass kubeconfig via secrets only — never echo.

Docs: [NHIM Audit CLI](https://app.blekline.com/docs/tools/nhim-audit)

## Local verify

```bash
pnpm build:packages
pnpm verify:integrations
pnpm test:nhim-audit:e2e
```

Docs: [CI/CD guide](https://app.blekline.com/docs/sdk/ci-cd)
