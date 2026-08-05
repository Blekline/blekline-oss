# RBAC — nhim-audit

## Recommended path (F500 eval namespaces)

1. Create namespace `nhim-eval` (or your eval namespace).
2. Apply **namespaced reader** in each namespace you scan:

```bash
kubectl apply -f deploy/rbac/nhim-audit-reader-namespaced.yaml -n nhim-eval
```

3. Apply **minimal cluster reader** (namespaces + admission webhooks only — no cluster-wide secrets):

```bash
kubectl apply -f deploy/rbac/nhim-audit-reader-cluster.yaml
```

4. Bind a ServiceAccount in `nhim-eval` to both roles (see RoleBinding subjects in YAML).

## Probe exec (optional)

Probe mode runs `curl` inside agent candidate pods. Apply **only** in namespaces you own:

```bash
kubectl apply -f deploy/rbac/nhim-audit-probe-namespaced.yaml -n nhim-eval
```

CLI requirement:

```bash
nhim-audit audit --probe --probe-allow-namespaces nhim-eval
```

The probe RoleBinding grants `pods/exec` **only** in the bound namespace. It cannot exec into `kube-system` unless you explicitly bind it there (not recommended).

## Cluster-wide legacy path

`deploy/rbac/nhim-audit-reader.yaml` remains for quick local demos. Production F500 evals should prefer namespaced Roles.

## Permission summary

| Resource | Namespaced Role | Cluster Role |
|----------|-----------------|--------------|
| pods, deployments, NP, secrets (list) | yes (in namespace) | no |
| namespaces (list) | no | yes |
| mutating/validating webhooks | no | yes |
| pods/exec | probe Role only | no |
