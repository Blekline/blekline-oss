// First act run (Go) — OpenAPI: POST /api/workspace/cell-runs
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	token := os.Getenv("BLEKLINE_WORKSPACE_TOKEN")
	wf := os.Getenv("BLEKLINE_WORKFLOW_ID")
	if token == "" {
		fmt.Fprintln(os.Stderr, "Set BLEKLINE_WORKSPACE_TOKEN=blw_... (runs:write)")
		os.Exit(1)
	}
	if wf == "" || len(wf) < 4 || wf[:3] != "wf_" {
		fmt.Fprintln(os.Stderr, "Set BLEKLINE_WORKFLOW_ID=wf_...")
		os.Exit(1)
	}
	base := os.Getenv("BLEKLINE_API_URL")
	if base == "" {
		base = "https://app.blekline.com"
	}
	body, _ := json.Marshal(map[string]any{
		"workflowId":     wf,
		"displayName":    "First act run (Go example)",
		"executionTier":  "act",
		"toolCall":       true,
	})
	req, err := http.NewRequest(http.MethodPost, base+"/api/workspace/cell-runs", bytes.NewReader(body))
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-blekline-workspace-token", token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		fmt.Fprintf(os.Stderr, "createCellRun failed (%d): %s\n", resp.StatusCode, string(b))
		os.Exit(1)
	}
	fmt.Println(string(b))
}