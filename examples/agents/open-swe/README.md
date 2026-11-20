# Open SWE style agents

Use **workflows + act runs** with `runs:write` token. Publish policy before side effects.

1. `npx @blekline/init`
2. Set `BLEKLINE_WORKFLOW_ID=wf_...`
3. Run this folder or [cells/first-act-run](../../cells/first-act-run/index.mjs):

```bash
export BLEKLINE_WORKSPACE_TOKEN="blw_..."
export BLEKLINE_WORKFLOW_ID="wf_..."
node examples/agents/open-swe/index.mjs
```

Docs: [Workflows and runs](https://app.blekline.com/docs/workflows-and-runs)

**Platform path:** [runtime policy](https://app.blekline.com/docs/runtime-policy) → [workflows and runs](https://app.blekline.com/docs/workflows-and-runs).