# VS Code Marketplace — submission kit

Extension ID: `blekline.blekline`  
Package: `vscode-extension/`  
Listing name: **Blekline**

Privacy policy: https://blekline.com/privacy  
Support: https://blekline.com · hello@blekline.com

## Listing copy

**Short description (≤132 chars)**  
Mask PII and secrets in Copilot Chat via @blekline. Does not intercept native @copilot.

**Long description**  
Use the README.md marketplace copy. Do not claim silent auto-send on native `@copilot`.

## 10-step QA (before submit)

1. **Contract smoke (headless CI)**  
   From repo root: `pnpm demo:vscode-extension-smoke`  
   Must print `vscode-extension-smoke OK`. Confirms `contributes.chatParticipants` (`id` `blekline.blekline`, `name` `blekline`, `isSticky` true) and commands `blekline.setup`, `blekline.verify`, `blekline.openActivity`.

2. **Compile**  
   `cd vscode-extension && pnpm compile`  
   `out/extension.js` exists; no `tsc` errors.

3. **Install + activate**  
   Launch Extension Development Host (F5) or install the VSIX. Status bar shows the shield. Command Palette lists **Blekline: Setup**, **Verify**, **Open Activity**.

4. **Setup / Secret Storage**  
   Run **Blekline: Setup**. Browser opens `app.blekline.com/auth/extension-link` (same handoff as the browser extension). After sign-in, paste a workspace token. Confirm it is **not** written to `settings.json`.

5. **Verify**  
   **Blekline: Verify** against production (or `BLEKLINE_API_URL`). Expect success, or a clear 401/plan-limit message — never a hang.

6. **`@blekline` mask path**  
   In Copilot Chat, send `@blekline Contact alice@corp.com`. Expect “Redacting before send…”, then a model reply. Prompt reaching the model must not contain the raw email.

7. **Honesty: native `@copilot` is not covered**  
   Send the same sensitive prompt with `@copilot` only (no `@blekline`). Confirm Blekline does **not** intercept or rewrite it. README and listing must say this.

8. **Blocked / fail-closed**  
   Send a prompt with a secret pattern (e.g. a documented example key). If policy blocks, chat shows a block notice and `sendRequest` is **not** called with the raw prompt. On mask API failure, the raw prompt is not forwarded.

9. **MCP contribution**  
   VS Code MCP view lists **blekline** as `npx -y @blekline/mcp-server`. After Setup, tools work with `BLEKLINE_WORKSPACE_TOKEN` from Secret Storage. `BLEKLINE_CLIENT_SURFACE=github-copilot`.

10. **Activity + icon**  
    **Blekline: Open Activity** opens `https://app.blekline.com/operations/activity` (or `$BLEKLINE_API_URL/...`). Marketplace icon: generate 128×128 PNG from `blekline-icon.svg` (see `assets/README.md`) and set `package.json` `"icon"` before the store upload. Do not submit without the PNG.

## Package

```bash
cd vscode-extension
pnpm compile
npx @vscode/vsce package
```

Upload the `.vsix`. Bump `version` for each submission.
