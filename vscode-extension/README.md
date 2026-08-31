# Blekline

Mask PII and secrets in VS Code Copilot Chat **before** the model sees them.

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=blekline.blekline) when listed — or load the VSIX from `vscode-extension/` for design-partner builds. Control plane: [app.blekline.com](https://app.blekline.com).

## What this extension does

- **`@blekline` chat participant** — type `@blekline` in Copilot Chat. Blekline calls `POST /api/mask`, then sends the **masked** text to the selected model.
- **MCP** — registers `@blekline/mcp-server` (`npx -y @blekline/mcp-server`) so tools can mask, evaluate, and audit.
- **Status bar shield** — connection state (Protected, Checking…, Blocked, plan limit).

## What this extension does not do

**It does not intercept native `@copilot`.** GitHub Copilot’s default chat path is unchanged. Protection in this client is the `@blekline` participant (and MCP tools you invoke). For silent auto-send on other surfaces, use the [browser extension](https://blekline.com) or ingress.

## Setup

1. Install **Blekline** and **GitHub Copilot Chat**.
2. Command Palette → **Blekline: Setup**.
3. Sign in at [app.blekline.com](https://app.blekline.com/auth/extension-link) (same handoff as the browser extension).
4. Paste a workspace token (`blw_…`) from **Admin → API keys**. It is stored in VS Code Secret Storage — never in settings.json.
5. Command Palette → **Blekline: Verify**.

Optional: set `BLEKLINE_API_URL` if you use a private control plane (default `https://app.blekline.com`).

## Plans

**Local** covers laptop hooks and stdio MCP. **`@blekline`** in Copilot Chat calls the hosted mask API and requires **Mark** or higher — upgrade in [Billing](https://app.blekline.com/admin/settings/billing) if Verify reports a plan limit.

## Use `@blekline`

In Copilot Chat:

```
@blekline Summarize this file. Contact is alice@corp.com
```

You should see “Redacting before send…”, then a model reply on the masked prompt. Repeat mentions stick (`isSticky`) so follow-ups stay on `@blekline`.

**Blekline: Open Activity** opens [workspace activity](https://app.blekline.com/operations/activity) (metadata; no raw prompts by default).

## Privacy

Prompt text is sent to your Blekline control plane over HTTPS for masking. See [Privacy](https://blekline.com/privacy) and [Trust boundaries](https://app.blekline.com/docs/security/trust-boundaries).

## Support

- Docs: [app.blekline.com/docs](https://app.blekline.com/docs)
- Issues: [blekline-oss](https://github.com/Blekline/blekline-oss/issues)
- Email: hello@blekline.com
