# Cluster posture CI gate

```bash
pnpm --filter @blekline/cluster-posture build
pnpm test:cluster-posture:e2e
```

GitHub Action: [ci/github-actions/cluster-posture](../../ci/github-actions/cluster-posture/action.yml)

Docs: [Operate: security](https://app.blekline.com/docs/operate/security)

**Platform path:** Optional before [spin up cells](https://app.blekline.com/docs/spin-up-cells). Publish [runtime policy](https://app.blekline.com/docs/runtime-policy) for act runs on connected compute.