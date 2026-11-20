# First act run (Python)

Requires a workspace, API key with **runs:write**, published policy, and `wf_...` workflow id.

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -e ../../packages/client-python
export BLEKLINE_WORKSPACE_TOKEN="blw_..."
export BLEKLINE_WORKFLOW_ID="wf_your_workflow_id"
export BLEKLINE_API_URL="https://app.blekline.com"
python main.py
```

Docs: [Workflows and runs](https://app.blekline.com/docs/workflows-and-runs)