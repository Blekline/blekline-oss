# Changelog — @blekline/nhim-audit

## 0.2.2 — Online probe token attestation

**Added**

- `assurance.probeTokenValidatedOnline: true` when `--probe` runs with `BLEKLINE_EVAL_ONLINE=1` and validate succeeds
- Skip message points to Deployment hub self-serve issue flow

## 0.2.1 — Terminal header + probe health fix

**Fixed**

- Briefing box no longer truncates `profile generic` to `generi` on real cluster runs
- PROBE-004 accepts **401** on injected sidecar `/health` (auth-required — matches production sidecar)

## 0.2.0 — Enterprise-neutral hardening

**Breaking changes**

- JSON `schemaVersion: "2.0"` with `profile`, `assurance`, `configFingerprint`
- `score.staticGateStatus` replaces `redTeamPhase0` (deprecated mirror retained)
- Generic profile: NHIM rules use vendor-neutral titles; Blekline checks moved to **BLEK-001..005** (`--profile blekline` only)
- NHIM-009/010 removed from generic; superseded by BLEK-001/002 under blekline profile
- `--probe` requires `--probe-allow-namespaces`
- Default terminal output is neutral (no BLEKLINE wordmark, no vendor CTAs)

**Added**

- NHIM-014..019, NHIM-023 rules
- `--profile generic|blekline`, `--config`, `--cluster-alias`
- Namespaced RBAC manifests (`reader-namespaced`, `reader-cluster`, `probe-namespaced`)
- `NHIM_PROBE_TOKEN` env alias (compat: `BLEKLINE_EVAL_TOKEN`)
- SARIF full rule catalog; anti-certification `assurance` block
- Fixtures: `fixed-generic`, `fixed-blekline`, `hostnetwork-broken`

**Migration from 0.1.3**

1. Pin `@blekline/nhim-audit@0.2.0` in CI.
2. Add `profile: generic` to GitHub Action (default).
3. Update JSON parsers: read `score.staticGateStatus` with fallback to `redTeamPhase0`.
4. If you relied on NHIM-009/010, switch to `--profile blekline` or map to BLEK-001/002.
5. For probe CI, add `probe-allow-namespaces` input.

## 0.1.3

Initial public release with NHIM-001..013 static rules and optional probe mode.
