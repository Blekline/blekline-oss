# First act run (SDK)

Requires a [Blekline workspace](https://app.blekline.com/auth/signup), API key with **runs:write**, a **published runtime policy**, and a workflow id (`wf_...`).

```bash
export BLEKLINE_WORKSPACE_TOKEN="blw_..."
export BLEKLINE_WORKFLOW_ID="wf_your_workflow_id"
export BLEKLINE_API_URL="https://app.blekline.com"
node index.mjs
```

Docs: [Workflows and runs](https://app.blekline.com/docs/workflows-and-runs) · [Spin up cells](https://app.blekline.com/docs/spin-up-cells)

Mask-only sample: [../node-sdk-agent](../node-sdk-agent/)