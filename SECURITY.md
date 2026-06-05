# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

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

## Safe harbor

We support good-faith security research. Do not access customer data, disrupt production services, or exceed what is necessary to demonstrate a vulnerability.

## Security contacts

- security@blekline.com — vulnerability reports
- https://blekline.com — product security inquiries
