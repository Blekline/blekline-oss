# Contributing to Blekline OSS

Thank you for helping improve the Blekline ingress control plane.

## Before you start

- Read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- For security issues, read [SECURITY.md](SECURITY.md) — **no public issues for vulnerabilities**

## Development setup

```bash
pnpm install
pnpm build:packages
pnpm verify:integrations
pnpm example:smoke
pnpm demo:mcp-smoke
pnpm demo:cursor-hook-smoke
pnpm demo:codex-hook-smoke
pnpm --filter @blekline/mcp-proxy test
pnpm --filter @blekline/cluster-posture test
pip install -e "./packages/client-python[dev]" && pnpm test:python
```

## Pull requests

1. Fork [blekline-oss](https://github.com/Blekline/blekline-oss)
2. Create a branch from `main`
3. Keep changes focused (one package or docs area per PR when possible)
4. Ensure CI passes: build + `verify:integrations` + `example:smoke` + smoke + proxy tests
5. Update [`integrations/manifest.json`](integrations/manifest.json) when adding a client surface; run `pnpm generate:mcp-configs`
6. Describe which client surface you tested (see [`integrations/README.md`](integrations/README.md))

## Licensing

By contributing, you agree your contributions are licensed under the same terms as the files you modify:

- **Apache-2.0** for `packages/contracts`, `packages/client`, `packages/client-python`
- **AGPL-3.0** for `packages/mcp-server`, `packages/mcp-proxy`, `packages/ingress-proxy`

See [COPYRIGHT](COPYRIGHT) and [NOTICE](NOTICE).

## Engineering bar (examples and integrations)

- **Contracts-first:** call `@blekline/client`, `blekline_client`, or documented OpenAPI shapes. No forked policy languages in examples.
- **Fail closed:** missing token, workflow, or publish step → non-zero exit with one actionable message.
- **No placeholder examples:** manifest `tier: example` only after `pnpm example:smoke` is green and a human signs adoption QA.
- **Secrets:** placeholders only (`blw_...`, provider keys documented as BYOK).

Before `pnpm sync:oss`: `pnpm audit:oss-public`, `pnpm verify:integrations`, update [CHANGELOG.md](CHANGELOG.md) for user-visible OSS changes.

## Documentation

User-facing docs live at **[app.blekline.com/docs](https://app.blekline.com/docs)** only.

Blekline team: edit `webapp/content/docs/` in the private monorepo, then deploy the webapp. Do **not** add doc pages under this OSS repo (only `docs/README.md` stub).

## Private monorepo

Blekline team members develop in the private `blekline` monorepo and sync to this repository via `pnpm sync:oss`. External contributors work directly on [blekline-oss](https://github.com/Blekline/blekline-oss).
