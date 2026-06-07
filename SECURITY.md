# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.3.x   | Yes       |
| 0.2.x   | Yes       |
| 0.1.x   | Best effort |

Older OSS tags are not maintained unless noted in a security advisory.

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Email **security@blekline.com** with:

- Description of the issue and impact
- Steps to reproduce
- Affected package (`@blekline/mcp-server`, `@blekline/client`, etc.)
- Optional: suggested fix or patch

We aim to:

- Acknowledge receipt within **5 business days**
- Provide an initial assessment within **10 business days**
- Coordinate disclosure after a fix or mitigation is available

## Scope

In scope:

- This repository (`blekline-oss`) and published npm packages under `@blekline/*`
- `blekline-client` on PyPI when published

Out of scope:

- The proprietary app at `app.blekline.com` (report via the same email; routed internally)
- Third-party MCP servers (e.g. Daytona) unless the issue is in Blekline proxy code

## Third-party dependencies

Published npm packages use a small, auditable dependency tree:

| Dependency | Used in | Role |
|------------|---------|------|
| [zod](https://www.npmjs.com/package/zod) | `@blekline/contracts` (and via MCP SDK) | Runtime schema validation for API and MCP payloads — not used to evaluate user-supplied code strings |
| [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) | `@blekline/mcp-server`, `@blekline/mcp-proxy` | Official MCP protocol transport and tooling |

**License mix (intentional):** AGPL packages (`mcp-server`, `mcp-proxy`, `ingress-proxy`) depend on Apache-2.0 `@blekline/contracts` and MIT-licensed MCP SDK transitives. This matches the open-core split documented in the README.

**Supply-chain scanners (e.g. Socket.dev):** Automated tools may flag Zod v4 internals that use dynamic code generation for schema documentation. That behavior is in upstream Zod, shared by the MCP ecosystem, and is not Blekline-specific. Report issues to **security@blekline.com** if you believe Blekline passes untrusted input into those code paths.

We run CI on every push to `main` and review dependency updates before OSS releases.

## Safe harbor

We support good-faith security research. Do not access customer data, disrupt production services, or exceed what is necessary to demonstrate a vulnerability.

## Security contacts

- security@blekline.com — vulnerability reports
- https://blekline.com — product security inquiries
