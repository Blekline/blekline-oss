# Demo — broken agent cluster (OSS)

Self-contained manifests for `nhim-audit demo broken` — agent deployment without sidecar or NetworkPolicy.

## Fixture demo (no cluster)

```bash
# From repo root after build
node packages/nhim-audit/dist/cli.js demo broken
node packages/nhim-audit/dist/cli.js audit --fixture broken
```

## Self-contained kind demo (OSS)

Apply minimal broken cluster manifests (no Blekline install required):

```bash
kubectl apply -f demo/namespace.yaml -f demo/agent-deployment.yaml
kubectl apply -f deploy/rbac/nhim-audit-reader.yaml
node dist/cli.js audit --namespace agent-ns
```

## Private monorepo — full before/after

From the Blekline private repo (not synced to OSS):

```bash
node scripts/nhim-audit-demo-kind.mjs broken   # demo manifests + audit
node scripts/nhim-audit-demo-kind.mjs fixed    # kind-install-blekline + audit
```

Track 03 sandbox: [app.blekline.com/docs/tools/nhim-audit](https://app.blekline.com/docs/tools/nhim-audit#demo)
