# @blekline/cluster-posture

Static Kubernetes scan for **agent workloads and enforcement hops** before you attach [connected compute and cell profiles](https://app.blekline.com/docs/spin-up-cells). No Blekline account required.

```bash
kubectl apply -f deploy/rbac/cluster-posture-reader-namespaced.yaml -n posture-eval
kubectl apply -f deploy/rbac/cluster-posture-reader-cluster.yaml

npx @blekline/cluster-posture audit --profile generic --namespace posture-eval --plain --json -o cluster-posture.json
```

## Rule IDs

User-facing findings use **`POSTURE-001` … `POSTURE-023`**. Legacy reports with `NHIM-*` ids are still accepted on import.

| Profile | Use |
|---------|-----|
| `generic` (default) | Vendor-neutral sidecar and NetworkPolicy patterns |
| `blekline` | Blekline connected-compute annotation heuristics |

## Docs

- [Operate: security](https://app.blekline.com/docs/operate/security)
- [Spin up cells](https://app.blekline.com/docs/spin-up-cells)

## GitHub Action

`ci/github-actions/cluster-posture/` — pin `@blekline/cluster-posture@0.3.0` or path `@main`.

## Deprecation

`@blekline/nhim-audit` is renamed to **`@blekline/cluster-posture`**. No new features ship on the old package name.