import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildAuditConfig } from "./config/load.js";
import type { AuditProfileName } from "./config/profile.js";
import { loadFixture, K8sLoadError } from "./k8s/client.js";
import {
  runAudit,
  shouldFail,
  meetsMinScore,
  diffAgainstBaseline,
  reportToJson,
} from "./report/audit.js";
import { calculateScore } from "./score.js";
import { renderWordmark, renderHeader, renderBriefingBox } from "./report/wordmark.js";
import { renderTerminal } from "./report/terminal.js";
import { validateEvalToken, resolveProbeToken } from "./probe/index.js";
import { rulesForProfile } from "./spec/rules.js";

function audit(cluster: ReturnType<typeof loadFixture>, profile: AuditProfileName = "generic") {
  const config = buildAuditConfig({ profile });
  return runAudit(cluster, { config });
}

describe("nhim-audit fixtures — generic profile", () => {
  it("broken cluster scores below 40 with critical findings", () => {
    const report = audit(loadFixture("broken"));
    assert.ok(report.score.value < 40);
    assert.ok(report.summary.critical >= 3);
    assert.equal(report.score.staticGateStatus, "fail");
    assert.equal(report.schemaVersion, "2.0");
    assert.equal(report.profile, "generic");
  });

  it("fixed-generic cluster scores at least 75 with zero critical", () => {
    const report = audit(loadFixture("fixed-generic"));
    assert.ok(report.score.value >= 75);
    assert.equal(report.summary.critical, 0);
    assert.equal(report.score.staticGateStatus, "unknown");
  });

  it("empty cluster caps at AT RISK and fails min-score 75", () => {
    const report = audit(loadFixture("empty"));
    assert.ok(report.score.value <= 74);
    assert.notEqual(report.score.band, "HARDENED");
    assert.equal(report.score.staticGateStatus, "unknown");
    assert.ok(report.findings.some((f) => f.id === "NHIM-013"));
    assert.equal(meetsMinScore(report, 75), false);
  });

  it("hostnetwork-broken emits NHIM-019 CRITICAL", () => {
    const report = audit(loadFixture("hostnetwork-broken"));
    assert.ok(report.findings.some((f) => f.id === "NHIM-019"));
    assert.equal(report.score.band, "CRITICAL");
    assert.doesNotMatch(report.findings.find((f) => f.id === "NHIM-019")!.title, /blekline/i);
  });

  it("critical fixture includes NHIM-014", () => {
    const report = audit(loadFixture("critical"));
    assert.ok(report.findings.some((f) => f.id === "NHIM-014"));
    assert.equal(report.score.staticGateStatus, "fail");
  });
});

describe("nhim-audit fixtures — blekline profile", () => {
  it("fixed-blekline scores at least 75 with BLEK rules", () => {
    const report = audit(loadFixture("fixed-blekline"), "blekline");
    assert.ok(report.score.value >= 75);
    assert.equal(report.summary.critical, 0);
    assert.ok(report.findings.some((f) => f.id.startsWith("BLEK-")));
  });

  it("broken blekline profile does not emit BLEK on empty cluster only", () => {
    const report = audit(loadFixture("broken"), "blekline");
    assert.ok(report.findings.some((f) => f.id === "BLEK-003" || f.id === "BLEK-001"));
  });
});

describe("assurance block", () => {
  it("generic fixed has notCertification and staticOnly without probe", () => {
    const report = audit(loadFixture("fixed-generic"));
    assert.equal(report.assurance.notCertification, true);
    assert.equal(report.assurance.staticOnly, true);
    assert.equal(report.assurance.probeExecuted, false);
    assert.ok(report.assurance.limitations.length >= 5);
    assert.notEqual(report.score.staticGateStatus, "pass");
  });
});

describe("score and CI gates", () => {
  it("shouldFail on high includes critical", () => {
    const report = audit(loadFixture("broken"));
    assert.equal(shouldFail(report, "high"), true);
    assert.equal(shouldFail(report, "critical"), true);
  });

  it("baseline diff finds new findings", () => {
    const base = audit(loadFixture("fixed-generic"));
    const current = audit(loadFixture("broken"));
    const diff = diffAgainstBaseline(current, base);
    assert.ok(diff.length > 0);
  });
});

describe("wordmark and terminal", () => {
  it("renders 5 lines for BLEKLINE", () => {
    const lines = renderWordmark("BLEKLINE");
    assert.equal(lines.length, 5);
    assert.match(lines[0], /█/);
  });

  it("generic header has no BLEKLINE wordmark", () => {
    const header = renderHeader({ brand: false, version: "0.2.0" });
    assert.doesNotMatch(header, /BLEKLINE/);
    assert.match(header, /NHIM AUDIT/);
  });

  it("briefing box shows full profile name", () => {
    const box = renderBriefingBox("kind-blekline-nhim", "0.2.0", "generic");
    assert.match(box, /profile generic/);
    assert.doesNotMatch(box, /profile generi[^c]/);
  });

  it("generic terminal has no enterprise@ email", () => {
    const report = audit(loadFixture("broken"));
    const out = renderTerminal(report, { plain: true, suppressVendorCta: true });
    assert.doesNotMatch(out, /enterprise@/);
    assert.match(out, /not certification|Evidence enablement/i);
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

  it("resolveProbeToken prefers NHIM_PROBE_TOKEN", () => {
    const prev = process.env.NHIM_PROBE_TOKEN;
    process.env.NHIM_PROBE_TOKEN = "blw_eval_from_nhim_env";
    assert.equal(resolveProbeToken(), "blw_eval_from_nhim_env");
    if (prev === undefined) delete process.env.NHIM_PROBE_TOKEN;
    else process.env.NHIM_PROBE_TOKEN = prev;
  });
});

describe("probe mode", () => {
  it("adds probed findings on broken fixture with valid token", async () => {
    const { runProbes } = await import("./probe/index.js");
    const cluster = loadFixture("broken");
    const config = buildAuditConfig({ profile: "generic" });
    const report = runAudit(cluster, { config });
    const probed = await runProbes(report, cluster, "blw_eval_test_token_12345", {
      fixture: "broken",
      config,
    });
    assert.equal(probed.mode, "static+probe");
    assert.ok(probed.summary.probed >= 1);
    assert.equal(probed.score.staticGateStatus, "fail");
    assert.ok(probed.findings.some((f) => f.evidence === "probed" && f.probeId === "PROBE-001"));
  });

  it("simulates pass probes on fixed-generic fixture", async () => {
    const { runProbes } = await import("./probe/index.js");
    const cluster = loadFixture("fixed-generic");
    const config = buildAuditConfig({ profile: "generic" });
    const report = runAudit(cluster, { config });
    const probed = await runProbes(report, cluster, "blw_eval_test_token_12345", {
      fixture: "fixed-generic",
      config,
    });
    assert.equal(probed.score.staticGateStatus, "pass");
    assert.ok(probed.findings.some((f) => f.probeId === "PROBE-002" && f.evidence === "probed"));
  });
});

describe("finding discipline", () => {
  it("CRITICAL static findings include STATIC subtitle", () => {
    const report = audit(loadFixture("broken"));
    const critical = report.findings.filter((f) => f.severity === "CRITICAL");
    assert.ok(critical.length > 0);
    for (const f of critical) {
      assert.match(f.subtitle ?? "", /STATIC/);
    }
  });
});

describe("SARIF export", () => {
  it("emits full rule catalog for generic profile", async () => {
    const { reportToSarif } = await import("./report/sarif.js");
    const report = audit(loadFixture("broken"));
    const sarif = JSON.parse(reportToSarif(report));
    assert.equal(sarif.version, "2.1.0");
    const ruleIds = sarif.runs[0].tool.driver.rules.map((r: { id: string }) => r.id);
    assert.ok(ruleIds.includes("NHIM-019"));
    assert.ok(!ruleIds.includes("BLEK-001"));
    assert.equal(ruleIds.length, rulesForProfile("generic").length);
  });

  it("includes BLEK rules for blekline profile", async () => {
    const { reportToSarif } = await import("./report/sarif.js");
    const report = audit(loadFixture("fixed-blekline"), "blekline");
    const sarif = JSON.parse(reportToSarif(report));
    const ruleIds = sarif.runs[0].tool.driver.rules.map((r: { id: string }) => r.id);
    assert.ok(ruleIds.includes("BLEK-001"));
  });
});

describe("JSON redaction", () => {
  it("does not leak live tokens in report JSON", () => {
    const report = audit(loadFixture("broken"));
    const json = reportToJson(report);
    assert.doesNotMatch(json, /blw_live_[A-Za-z0-9]+/);
  });

  it("includes reportIntegrity sha256", () => {
    const report = audit(loadFixture("broken"));
    assert.ok(report.reportIntegrity?.sha256);
    assert.match(report.reportIntegrity!.sha256, /^[a-f0-9]{64}$/);
  });
});

describe("exit codes", () => {
  it("K8sLoadError uses code 3 for unreachable cluster", () => {
    const err = new K8sLoadError("Cluster unreachable: ETIMEDOUT", 3);
    assert.equal(err.code, 3);
  });
});

describe("calculateScore", () => {
  it("never passes static gate without probe on clean static", () => {
    const report = audit(loadFixture("fixed-generic"));
    const score = calculateScore(report.findings, report.candidates.length, false);
    assert.notEqual(score.staticGateStatus, "pass");
  });
});
