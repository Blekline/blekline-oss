# Enterprise runbook — nhim-audit 0.2.0

## Pre-flight

1. Apply namespaced RBAC ([RBAC.md](./RBAC.md)).
2. Choose profile: `generic` for vendor-neutral assessment; `blekline` for Blekline reference stack.
3. Optional: copy `nhim-audit.example.json` and tune sidecar/NP patterns for your org.

## Static audit (air-gapped friendly)

```bash
nhim-audit audit \
  --kubeconfig "$KUBECONFIG" \
  --namespace nhim-eval \
  --cluster-alias "staging-us-east" \
  --profile generic \
  --json -o nhim-audit.json
```

Upload JSON to your posture hub or GRC ticket. JSON includes `assurance.notCertification: true` and `limitations[]` — attach to security reviews as **evidence enablement**, not certification.

## Baseline CI (regression gate)

```bash
nhim-audit audit --json -o current.json --baseline nhim-audit-baseline.json
```

Exit 1 only on **new** findings vs baseline. Refresh baseline on approved architecture changes.

## Probe verification

Requires eval token and explicit namespace allowlist:

```bash
export NHIM_PROBE_TOKEN=blw_eval_…
export BLEKLINE_EVAL_ONLINE=0   # air-gapped offline validation

nhim-audit audit \
  --probe \
  --probe-allow-namespaces nhim-eval \
  --profile generic \
  --json -o nhim-audit-probed.json
```

Only after probe passes should you claim runtime mandatory-hop enforcement.

## SARIF → DefectDojo / GHAS

```bash
nhim-audit audit --format sarif -o nhim-audit.sarif
```

SARIF includes full NHIM rule catalog with neutral titles. Map `NHIM-*` IDs in DefectDojo; re-import each CI run.

## Manual smoke checklist

1. Apply namespaced RBAC → static audit succeeds in eval namespace.
2. Upload 0.2.0 JSON to posture UI → parses `schemaVersion`, `staticGateStatus`, `limitations`.
3. `--fixture hostnetwork-broken` → NHIM-019 CRITICAL visible in plain output.

## Pentest crosswalk

| nhim-audit | External pentest |
|------------|------------------|
| Static NP / webhook gaps | Egress bypass, SSRF to metadata |
| `--probe` curl egress | Confirmed runtime bypass |
| Not in scope | Prompt injection, model abuse |

## Support

Rule reference: https://app.blekline.com/docs/tools/nhim-audit

Probe token: https://app.blekline.com/docs/tools/nhim-audit#probe-access
