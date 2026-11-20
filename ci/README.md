# Blekline CI / CD

Gate agent tool calls in pipelines before they reach production APIs.

## GitHub Actions

Copy [`github-actions/blekline-gate.yml.example`](github-actions/blekline-gate.yml.example) to `.github/workflows/blekline-gate.yml` and set repository secrets:

- `BLEKLINE_WORKSPACE_TOKEN` — workspace API key (`blw_...`)
- `BLEKLINE_API_URL` — `https://app.blekline.com` (or self-hosted ingress)

### Cluster posture (K8s agent-hop gate)

Merge-blocking static audit — no workspace token:

```yaml
- uses: Blekline/blekline-oss/ci/github-actions/cluster-posture@main
  with:
    kubeconfig: ${{ secrets.KUBECONFIG }}
    fail-on: high
    min-score: "75"
    output: cluster-posture.json
- uses: actions/upload-artifact@v4
  with:
    name: cluster-posture-report
    path: cluster-posture.json
```

SARIF: set `format: sarif` and `output: cluster-posture.sarif`. Pass kubeconfig via secrets only — never echo.

Docs: [Operate: security](https://app.blekline.com/docs/operate/security) · [examples/ci/cluster-posture-gate](../examples/ci/cluster-posture-gate/README.md)

## Local verify

```bash
pnpm build:packages
pnpm verify:integrations
pnpm test:cluster-posture:e2e
```

Docs: [CI/CD guide](https://app.blekline.com/docs/sdk/ci-cd)
