# LangChain tool guard

Wrap LangChain-style tools with `withBleklineToolGuard` from `@blekline/langchain`.

From repo root (after `pnpm build:packages`):

```bash
export BLEKLINE_WORKSPACE_TOKEN="blw_..."
node examples/frameworks/langchain-tool-guard/index.mjs "search alice@corp.com"
```

Docs: [LangChain stack](https://app.blekline.com/docs/integrations/langchain-stack) · Package: `packages/langchain`

**Platform path:** [runtime policy](https://app.blekline.com/docs/runtime-policy) → [workflows and runs](https://app.blekline.com/docs/workflows-and-runs).