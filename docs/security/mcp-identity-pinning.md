---
title: MCP identity pinning
description: Pin MCP server command paths to prevent config swap attacks (MCPoison-style).
---

# MCP identity pinning

Enterprise fleets should pin MCP server binaries so a local config edit cannot swap in a malicious command.

## Codex (`identity` block)

In `.codex/config.toml`:

```toml
[mcp_servers.blekline]
command = "node"
args = ["packages/mcp-server/dist/index.js"]

[mcp_servers.blekline.identity]
# Pin SHA-256 of dist/index.js after build
digest = "sha256:REPLACE_AFTER_BUILD"
```

Rebuild digest after each release:

```bash
shasum -a 256 packages/mcp-server/dist/index.js
```

## Cursor / Claude Desktop

- Prefer `${workspaceFolder}` paths inside a trusted monorepo checkout.
- Restrict write access to `.cursor/mcp.json` and Claude config via MDM or repo CODEOWNERS.
- Rotate workspace tokens if config drift is detected.

## Blekline proxy chain

When using `blekline-proxy` → Daytona downstream, pin **both** proxy and downstream command hashes. Deny unknown tools via workspace MCP tool policy (`/operations/policies`).

## References

- Cursor MCP security guidance (third-party summaries cite MCPoison-style risks)
- Blekline trust boundaries: [/docs/security/trust-boundaries](docs/security/trust-boundaries)
