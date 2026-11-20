// POST /api/workspace/cell-runs via reqwest — extend this starter or use the Go/TS SDKs.
fn main() {
    let token = std::env::var("BLEKLINE_WORKSPACE_TOKEN").unwrap_or_default();
    if token.is_empty() || !token.starts_with("blw_") {
        eprintln!("Set BLEKLINE_WORKSPACE_TOKEN=blw_... (runs:write)");
        std::process::exit(1);
    }
    let wf = std::env::var("BLEKLINE_WORKFLOW_ID").unwrap_or_default();
    if !wf.starts_with("wf_") {
        eprintln!("Set BLEKLINE_WORKFLOW_ID=wf_...");
        std::process::exit(1);
    }
    eprintln!(
        "POST https://app.blekline.com/api/workspace/cell-runs with workflowId={wf} — implement with reqwest (see Go example)."
    );
    std::process::exit(2);
}