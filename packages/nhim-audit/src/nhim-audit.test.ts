import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadFixture, K8sLoadError } from "./k8s/client.js";
import { runAudit, shouldFail, meetsMinScore, diffAgainstBaseline, reportToJson } from "./report/audit.js";
import { calculateScore } from "./score.js";
import { renderWordmark } from "./report/wordmark.js";
import { validateEvalToken } from "./probe/index.js";

describe("nhim-audit fixtures", () => {
  it("broken cluster scores below 40 with critical findings", () => {
    const cluster = loadFixture("broken");
    const report = runAudit(cluster);
    assert.ok(report.score.value < 40);
    assert.ok(report.summary.critical >= 3);
    assert.equal(report.score.redTeamPhase0, "fail");
  });

  it("fixed cluster scores at least 75 with zero critical", () => {
    const cluster = loadFixture("fixed");
    const report = runAudit(cluster);
    assert.ok(report.score.value >= 75);
    assert.equal(report.summary.critical, 0);
    assert.equal(report.score.redTeamPhase0, "pass");
  });

  it("empty cluster scores high", () => {
    const cluster = loadFixture("empty");
    const report = runAudit(cluster);
    assert.ok(report.score.value >= 90);
  });
});

describe("score and CI gates", () => {
  it("shouldFail on high includes critical", () => {
    const report = runAudit(loadFixture("broken"));
    assert.equal(shouldFail(report, "high"), true);
    assert.equal(shouldFail(report, "critical"), true);
  });

  it("meetsMinScore", () => {
    const report = runAudit(loadFixture("fixed"));
    assert.equal(meetsMinScore(report, 75), true);
    assert.equal(meetsMinScore(report, 101), false);
  });

  it("baseline diff finds new findings", () => {
    const base = runAudit(loadFixture("fixed"));
    const current = runAudit(loadFixture("broken"));
    const diff = diffAgainstBaseline(current, base);
    assert.ok(diff.length > 0);
  });
});

describe("wordmark", () => {
  it("renders 5 lines for BLEKLINE", () => {
    const lines = renderWordmark("BLEKLINE");
    assert.equal(lines.length, 5);
    assert.match(lines[0], /█/);
  });
});

describe("eval token", () => {
  it("rejects missing token", async () => {
    const r = await validateEvalToken("");
    assert.equal(r.valid, false);
  });

  it("accepts blw_eval prefix", async () => {
    const r = await validateEvalToken("blw_eval_test_token_12345");
    assert.equal(r.valid, true);
  });

  it("rejects workspace live token prefix", async () => {
    const workspaceToken = ["blw", "live", "abc123"].join("_");
    const r = await validateEvalToken(workspaceToken);
    assert.equal(r.valid, false);
  });
});

describe("probe mode", () => {
  it("adds probed findings on broken fixture with valid token", async () => {
    const { runProbes } = await import("./probe/index.js");
    const cluster = loadFixture("broken");
    const report = runAudit(cluster);
    const probed = await runProbes(report, cluster, "blw_eval_test_token_12345", { fixture: "broken" });
    assert.equal(probed.mode, "static+probe");
    assert.ok(probed.summary.probed >= 1);
    assert.ok(probed.findings.some((f) => f.evidence === "probed" && f.probeId === "PROBE-001"));
  });

  it("simulates pass probes on fixed fixture", async () => {
    const { runProbes } = await import("./probe/index.js");
    const cluster = loadFixture("fixed");
    const report = runAudit(cluster);
    const probed = await runProbes(report, cluster, "blw_eval_test_token_12345", { fixture: "fixed" });
    assert.ok(probed.findings.some((f) => f.probeId === "PROBE-002" && f.evidence === "probed"));
  });
});

describe("finding discipline", () => {
  it("CRITICAL static findings include STATIC subtitle", () => {
    const report = runAudit(loadFixture("broken"));
    const critical = report.findings.filter((f) => f.severity === "CRITICAL");
    assert.ok(critical.length > 0);
    for (const f of critical) {
      assert.match(f.subtitle ?? "", /STATIC/);
    }
  });
});

describe("baseline and CI gates", () => {
  it("baseline diff ignores unchanged fixed cluster", () => {
    const fixed = runAudit(loadFixture("fixed"));
    const diff = diffAgainstBaseline(fixed, fixed);
    assert.equal(diff.length, 0);
  });

  it("baseline detects regression from fixed to broken", () => {
    const base = runAudit(loadFixture("fixed"));
    const current = runAudit(loadFixture("broken"));
    assert.ok(diffAgainstBaseline(current, base).length > 0);
  });
});

describe("SARIF export", () => {
  it("emits SARIF 2.1 with ruleId and ASI properties", async () => {
    const { reportToSarif } = await import("./report/sarif.js");
    const report = runAudit(loadFixture("broken"));
    const sarif = JSON.parse(reportToSarif(report));
    assert.equal(sarif.version, "2.1.0");
    assert.ok(sarif.runs[0].results.length > 0);
    assert.ok(sarif.runs[0].tool.driver.rules.some((r: { id: string }) => r.id === "NHIM-001"));
  });
});

describe("JSON redaction", () => {
  it("does not leak live tokens in report JSON", () => {
    const report = runAudit(loadFixture("broken"));
    const json = reportToJson(report);
    assert.doesNotMatch(json, /blw_live_[A-Za-z0-9]+/);
  });
});

describe("exit codes", () => {
  it("K8sLoadError uses code 3 for unreachable cluster", () => {
    const err = new K8sLoadError("Cluster unreachable: ETIMEDOUT", 3);
    assert.equal(err.code, 3);
  });
});
