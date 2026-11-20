# First act run (Rust)

Fail-closed stub until `blekline-rs` publishes. Validates env then prints the REST target (see Go example for a full client).

```bash
export BLEKLINE_WORKSPACE_TOKEN="blw_..."
export BLEKLINE_WORKFLOW_ID="wf_..."
cargo run --manifest-path examples/cells/first-act-run-rust/Cargo.toml
```

OpenAPI: `packages/contracts/openapi.yaml` · [SDK client](https://app.blekline.com/docs/sdk-client)

**Platform path:** [runtime policy](https://app.blekline.com/docs/runtime-policy) → [workflows and runs](https://app.blekline.com/docs/workflows-and-runs).