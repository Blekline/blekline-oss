# First act run (Go)

REST example matching [packages/contracts/openapi.yaml](../../packages/contracts/openapi.yaml). Requires **runs:write** token and `wf_...`.

```bash
export BLEKLINE_WORKSPACE_TOKEN="blw_..."
export BLEKLINE_WORKFLOW_ID="wf_your_workflow_id"
go run main.go
```

Docs: [SDK client](https://app.blekline.com/docs/sdk-client)

**Platform path:** [runtime policy](https://app.blekline.com/docs/runtime-policy) → [workflows and runs](https://app.blekline.com/docs/workflows-and-runs).