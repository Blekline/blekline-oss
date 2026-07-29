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
pnpm demo:mcp-smoke
pnpm --filter @blekline/mcp-proxy test
pnpm --filter @blekline/nhim-audit test
pip install -e "./packages/client-python[dev]" && pnpm test:python
```

## Pull requests

1. Fork [blekline-oss](https://github.com/Blekline/blekline-oss)
2. Create a branch from `main`
3. Keep changes focused (one package or docs area per PR when possible)
4. Ensure CI passes: build + `verify:integrations` + smoke + proxy tests
5. Update [`integrations/manifest.json`](integrations/manifest.json) when adding a client surface; run `pnpm generate:mcp-configs`
6. Describe which client surface you tested (see [`integrations/README.md`](integrations/README.md))

## Licensing

By contributing, you agree your contributions are licensed under the same terms as the files you modify:

- **Apache-2.0** for `packages/contracts`, `packages/client`, `packages/client-python`
- **AGPL-3.0** for `packages/mcp-server`, `packages/mcp-proxy`, `packages/ingress-proxy`

See [COPYRIGHT](COPYRIGHT) and [NOTICE](NOTICE).

## Documentation

User-facing docs live at **[app.blekline.com/docs](https://app.blekline.com/docs)** only.

Blekline team: edit `webapp/content/docs/` in the private monorepo, then deploy the webapp. Do **not** add doc pages under this OSS repo (only `docs/README.md` stub).

## Private monorepo

Blekline team members develop in the private `blekline` monorepo and sync to this repository via `pnpm sync:oss`. External contributors work directly on [blekline-oss](https://github.com/Blekline/blekline-oss).
