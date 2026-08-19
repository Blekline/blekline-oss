# Limitations — nhim-audit

## Static vs probe

| Mode | Proves | Does not prove |
|------|--------|----------------|
| Static (default) | Architectural misconfiguration | Runtime bypass |
| `--probe` | Egress block + enforcement API reachability | Full red-team coverage |

Generic profile sets `score.staticGateStatus` to `unknown` until `--probe` runs. Set `BLEKLINE_EVAL_ONLINE=1` to attest token validation against Blekline before probing.

## Blind spots

- **Kubernetes NetworkPolicy only** — CiliumNetworkPolicy, Calico GlobalNetworkPolicy, cloud security groups, and NACLs are out of scope unless reflected in standard NP objects.
- **Service mesh** — Istio/Linkerd may enforce hops via AuthorizationPolicy; NHIM-023 flags mesh presence but does not fully verify mesh policy.
- **Agent heuristics** — Discovery uses labels, env key names, and image patterns. Expect false positives and false negatives; tune via `--config` and `--label-selector`.
- **hostNetwork / hostPID / privileged** — NHIM-019 covers hostNetwork; other escape hatches may require manual review.
- **Not certification** — Output is not OWASP ASI, AIUC-1, EU AI Act, SOC2, or penetration test sign-off.

## Probe scope

- Executes `curl` from one Running agent candidate pod per scan.
- Requires `pods/exec` in explicitly allowlisted namespaces.
- Enforcement API paths are configurable; defaults assume common sidecar patterns.

## False positive mitigation

- Use `allowlist.findings` in config for known-good exceptions.
- Narrow discovery with `--namespace` and `--label-selector`.
- Run `--baseline` in CI to ignore accepted drift.
