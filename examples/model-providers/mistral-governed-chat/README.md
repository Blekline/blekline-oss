# Mistral AI — governed prompt (BYOK)

Platform path: publish policy → mask/enforce via `@blekline/client` → send **masked** text to Mistral with **your** API key.

```bash
export BLEKLINE_WORKSPACE_TOKEN="blw_..."
node index.mjs "Email me at bob@example.com"
```

Optional: `MISTRAL_API_KEY` (never commit). Blekline does not host Mistral inference in OSS.

Docs: [Mistral stack](https://app.blekline.com/docs/integrations/mistral-stack)

**Platform path:** [runtime policy](https://app.blekline.com/docs/runtime-policy) → [workflows and runs](https://app.blekline.com/docs/workflows-and-runs). Mistral inference uses your API key (BYOK); Blekline does not host Mistral in OSS.