# @blekline/nhim-audit

**Kubernetes agent execution path audit** — does this cluster enforce a mandatory hop for agent candidate workloads?

Agents moved from IDE plugins to cluster workloads. NetworkPolicy and CASB do not answer: *can this pod reach tools or LLMs without an enforcement sidecar or mesh hop?*

Default profile is **vendor-neutral** (`--profile generic`). Blekline is a reference implementation (`--profile blekline`).

```bash
# Namespaced RBAC first (recommended for F500 eval namespaces)
kubectl apply -f deploy/rbac/nhim-audit-reader-namespaced.yaml -n nhim-eval
kubectl apply -f deploy/rbac/nhim-audit-reader-cluster.yaml

npx @blekline/nhim-audit audit --profile generic
```

## Quick start

```bash
npx @blekline/nhim-audit demo broken          # terminal demo
npx @blekline/nhim-audit audit --fixture broken --json
npx @blekline/nhim-audit audit --profile blekline --fixture fixed-blekline --brand
```

## Profiles

| Profile | Use |
|---------|-----|
| `generic` (default) | Vendor-neutral NHIM-001..019 — Istio/Linkerd/generic sidecar patterns |
| `blekline` | Adds BLEK-001..005 (Helm, Blekline webhook, Auto-Route, image pin) |

Org overrides: `--config nhim-audit.example.json` (sidecar names, NP patterns, allowlists).

## Rule catalog (generic)

| ID | Severity | Check |
|----|----------|-------|
| NHIM-001 | CRITICAL | No enforcement sidecar or inject annotation |
| NHIM-002 | CRITICAL | No mandatory-hop egress NetworkPolicy |
| NHIM-003 | HIGH | Mutating admission for injection not detected |
| NHIM-004 | HIGH | Enforcement webhook fail-open (`failurePolicy: Ignore`) |
| NHIM-005 | HIGH | Enforcement plane externally exposed |
| NHIM-006 | MEDIUM | LLM credentials without enforcement hop path |
| NHIM-007 | MEDIUM | Enforcement auth secret missing |
| NHIM-008 | MEDIUM | Policy engine not detected (Gatekeeper/Kyverno/VAP) |
| NHIM-011 | MEDIUM | Default-allow egress across agent namespaces |
| NHIM-013 | MEDIUM | No agent candidates discovered |
| NHIM-014 | CRITICAL | Wide HTTPS egress (0.0.0.0/0:443 bypass) |
| NHIM-015 | MEDIUM | Inject enabled but auto-route disabled |
| NHIM-016 | MEDIUM | LLM config via envFrom only |
| NHIM-017 | MEDIUM | Sidecar present but LLM upstream path env missing |
| NHIM-018 | HIGH | iptables auto-route without injected sidecar |
| NHIM-019 | CRITICAL | Agent candidate uses `hostNetwork` (NP bypass) |
| NHIM-023 | INFO | Istio/mesh detected — K8s NP hop not verified |

Blekline-only: **BLEK-001..005** under `--profile blekline`.

Full reference: [app.blekline.com/docs/tools/nhim-audit](https://app.blekline.com/docs/tools/nhim-audit)

## JSON schema 2.0

```json
{
  "schemaVersion": "2.0",
  "profile": "generic",
  "assurance": {
    "notCertification": true,
    "staticOnly": true,
    "probeExecuted": false,
    "limitations": ["..."]
  },
  "score": {
    "value": 82,
    "band": "PARTIAL",
    "staticGateStatus": "unknown"
  }
}
```

**Evidence enablement only — not OWASP, AIUC-1, EU AI Act, or pentest certification.**

Generic profile never emits `staticGateStatus: "pass"` without `--probe`.

## RBAC

| Manifest | Scope |
|----------|-------|
| `deploy/rbac/nhim-audit-reader-namespaced.yaml` | Role in eval namespace(s) |
| `deploy/rbac/nhim-audit-reader-cluster.yaml` | ClusterRole: namespaces + webhooks only |
| `deploy/rbac/nhim-audit-probe-namespaced.yaml` | Role: `pods/exec` in eval namespace |

See [docs/RBAC.md](./docs/RBAC.md).

## Probe mode

Issue token in [Deployment hub](https://app.blekline.com/operations/posture) after uploading nhim-audit JSON (self-serve eval), or use a welcome-pack token for paid sandbox partners.

```bash
BLEKLINE_EVAL_ONLINE=1 \
NHIM_PROBE_TOKEN=blw_eval_… nhim-audit audit \
  --probe \
  --probe-allow-namespaces nhim-eval \
  --profile generic
```

When online validation succeeds, reports include `assurance.probeTokenValidatedOnline: true`.

`BLEKLINE_EVAL_TOKEN` accepted for compatibility. `--probe-allow-namespaces` is **required** with `--probe`.

## CI

```yaml
- uses: Blekline/blekline-oss/ci/github-actions/nhim-audit@main
  with:
    kubeconfig: ${{ secrets.KUBECONFIG }}
    profile: generic
    fail-on: high
    min-score: "75"
```

## Docs

- [ENTERPRISE.md](./docs/ENTERPRISE.md) — F500 runbook, baseline CI, SARIF import
- [LIMITATIONS.md](./docs/LIMITATIONS.md) — static vs probe, mesh/SG blind spots
- [COMPETITIVE.md](./docs/COMPETITIVE.md) — vs Kubescape / Polaris
- [CHANGELOG.md](./CHANGELOG.md) — 0.1.3 → 0.2.0 migration

## License

AGPL-3.0-or-later
