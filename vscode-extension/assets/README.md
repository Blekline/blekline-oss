# Marketplace icon

Generate the VS Code Marketplace icon from `blekline-icon.svg` (128×128 PNG) before submission.

Source (monorepo): `extension/assets/blekline-icon.svg` or `webapp/public/branding/blekline-icon.svg`.

Suggested output:

- `assets/icon.png` — 128×128, used as `package.json` `"icon"`

Do not ship a placeholder. Until the PNG exists, the extension uses the built-in shield theme icon in the status bar and chat participant.
