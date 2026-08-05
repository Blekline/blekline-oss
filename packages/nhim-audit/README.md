# @blekline/nhim-audit

Static Kubernetes audit for agent candidate workloads that can reach tools or LLMs without a mandatory enforcement hop.

Agents moved from IDE plugins to cluster workloads. NetworkPolicy and CASB do not answer: *does this pod route tool execution through your control plane?*

```bash
kubectl apply -f https://raw.githubusercontent.com/Blekline/blekline-oss/main/packages/nhim-audit/deploy/rbac/nhim-audit-reader.yaml
npx @blekline/nhim-audit audit
```

## Why this exists

Platform teams deploy LangGraph, CrewAI, and MCP-backed workers in Kubernetes. Without a mandatory hop through your enforcement sidecar, those pods can call tools and model APIs directly. This CLI finds that gap in about five minutes — no Blekline account required for static audit.

## What it checks

| ID | Severity | OWASP ASI | Check |
|----|----------|-----------|-------|
| NHIM-001 | CRITICAL | ASI02, ASI10 | No sidecar / inject annotation on agent candidate |
| NHIM-002 | CRITICAL | ASI10 | No mandatory-hop NetworkPolicy |
| NHIM-003 | HIGH | ASI08 | Admission webhook missing |
| NHIM-004 | HIGH | ASI08 | Webhook `failurePolicy: Ignore` |
| NHIM-005 | HIGH | ASI03 | Sidecar Service exposed via LoadBalancer/NodePort |
| NHIM-006 | MEDIUM | ASI02 | LLM env without sidecar path |
| NHIM-007 | MEDIUM | ASI03 | `blekline-sidecar-auth` secret missing |
| NHIM-008 | MEDIUM | ASI10 | Agent namespace policy gap |
| NHIM-009 | LOW | — | Blekline Helm release absent |
| NHIM-010 | INFO | ASI08 | Sidecar health not verified (static mode) |
| NHIM-011 | MEDIUM | ASI10 | Default-allow egress shared by agent candidates |
| NHIM-012 | INFO | — | Shared responsibility reminder (not scored) |
| NHIM-013 | MEDIUM | ASI10 | No agent candidates discovered (score capped ≤74) |

Full rule reference: [app.blekline.com/docs/tools/nhim-audit](https://app.blekline.com/docs/tools/nhim-audit)

## Framework alignment

**Evidence enablement only — not OWASP, AIUC-1, or EU AI Act certification.**

- **OWASP ASI Top 10** (agentic) — primary mapping on findings (ASI02 tool misuse, ASI08 C2, ASI10 rogue agent)
- **AIUC-1** — security/accountability evidence inputs for customer audits
- **EU AI Act** — audit JSON may support control documentation; legal classification remains customer + counsel
- **OWASP LLM Top 10** — out of scope (model-layer risks such as prompt injection into the foundation model)

## What it does not do

- Certify your organization against OWASP, AIUC-1, or EU AI Act
- Prove runtime bypass without `--probe` (static rules infer architectural risk)
- Confirm a workload is an AI agent (uses **agent candidate** heuristics — expect false positives/negatives)
- Replace penetration testing, Kubescape, or endpoint agent tools
- Accept workspace tokens (`blw_live_*`) for probe mode — use `BLEKLINE_EVAL_TOKEN` only

## Output

Score bands: **0–39 CRITICAL** · **40–69 AT RISK** · **70–89 PARTIAL** · **90–100 HARDENED**

Key JSON fields: `score.value`, `score.band`, `score.redTeamPhase0`, `summary.critical`, `findings[].evidence` (`static` | `probed`).

```bash
npx @blekline/nhim-audit audit --plain --json -o nhim-audit.json
```

SARIF 2.1 (GitHub Advanced Security / DefectDojo):

```bash
npx @blekline/nhim-audit audit --format sarif -o nhim-audit.sarif
```

**DefectDojo import:** Product type *Infrastructure*, scan type *SARIF*. Map `NHIM-*` rule IDs to findings; severity follows SARIF level. Re-import on each CI run; use `--baseline` JSON in parallel to fail only on regressions.

**GitHub Advanced Security:** Upload SARIF via `github/codeql-action/upload-sarif` (requires GHAS). Rule help URI points to `app.blekline.com/docs/tools/nhim-audit`.

## CI

```yaml
- uses: Blekline/blekline-oss/ci/github-actions/nhim-audit@main
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

Baseline on release branches (fail only on **new** findings):

```yaml
- uses: Blekline/blekline-oss/ci/github-actions/nhim-audit@main
  with:
    kubeconfig: ${{ secrets.KUBECONFIG }}
    baseline: nhim-audit-baseline.json
    output: nhim-audit.json
```

Or inline:

```yaml
- run: npx @blekline/nhim-audit audit --plain --json --fail-on high --min-score 75 -o nhim-audit.json
  env:
    KUBECONFIG: /path/to/kubeconfig
```

**Exit codes:** `0` pass · `1` fail threshold / baseline regression · `2` config or RBAC error · `3` cluster unreachable

Pass kubeconfig via `secrets.KUBECONFIG` only — never echo or commit. Upload reports as CI artifacts; redact cluster names if your policy requires it.

## RBAC

Apply least-privilege reader before first scan:

```bash
kubectl apply -f deploy/rbac/nhim-audit-reader.yaml
```

For `--probe`, also apply exec permission:

```bash
kubectl apply -f deploy/rbac/nhim-audit-probe.yaml
```

## Probe access

Static audit is free. Active bypass verification (`--probe`) requires a free eval token:

```bash
BLEKLINE_EVAL_TOKEN=blw_eval_… nhim-audit audit --probe
```

Request token: [docs#probe-access](https://app.blekline.com/docs/tools/nhim-audit#probe-access) or email `enterprise@blekline.com` with your `nhim-audit.json`.

## Fix path

Findings include fix snippets pointing to public Helm charts and [K8s deployment docs](https://app.blekline.com/docs/enterprise/k8s-deployment). nhim-audit finds gaps; `@blekline/ingress-proxy` sidecar and admission webhook close them.

## Security

See [SECURITY.md](https://github.com/Blekline/blekline-oss/blob/main/SECURITY.md). Reports include env key **names** only — never secret values.

## License

AGPL-3.0-or-later
