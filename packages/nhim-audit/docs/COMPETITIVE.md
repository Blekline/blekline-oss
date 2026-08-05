# Competitive positioning — nhim-audit

## vs Kubescape

| | Kubescape | nhim-audit |
|---|-----------|------------|
| Focus | CIS/NSA hardening, CVEs, RBAC misconfig | Agent execution path / mandatory hop |
| Agent workloads | Generic workload rules | Agent candidate heuristics + LLM env signals |
| Output | Multiple frameworks | OWASP ASI-aligned NHIM rules + SARIF |

Complementary: run Kubescape for cluster baseline; nhim-audit for agent egress enforcement gaps.

## vs Polaris / Fairwinds

| | Polaris | nhim-audit |
|---|---------|------------|
| Focus | Best practices (resources, probes, tags) | Enforcement sidecar + mandatory-hop NP |
| Admission | Optional | Detects mutating webhook fail-open |
| Probe | No active egress test | Optional `--probe` curl bypass test |

## vs kube-bench

kube-bench checks node/CIS compliance. nhim-audit checks **workload egress architecture** for AI agent candidates — different layer.

## When to use nhim-audit

- Platform team deploying LangGraph, CrewAI, MCP workers in Kubernetes
- Security review asking "can agents bypass our tool governance hop?"
- CI gate before promoting agent namespaces to production

## When not to use nhim-audit alone

- Full cluster CIS audit → use Kubescape/kube-bench
- Model-layer prompt injection → out of scope
- Certification sign-off → requires formal assessment + probe/pentest program
