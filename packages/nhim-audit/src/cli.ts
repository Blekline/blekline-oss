#!/usr/bin/env node
import { Command } from "commander";
import { writeFileSync } from "node:fs";
import { loadClusterSnapshot, K8sLoadError } from "./k8s/client.js";
import {
  diffAgainstBaseline,
  filterFindings,
  meetsMinScore,
  readReport,
  reportToJson,
  runAudit,
  shouldFail,
  writeReport,
  type FailOnLevel,
} from "./report/audit.js";
import { renderTerminal } from "./report/terminal.js";
import { reportToSarif } from "./report/sarif.js";
import { validateEvalToken, runProbes } from "./probe/index.js";
import type { AuditReport, Severity } from "./types.js";
import { VERSION } from "./version.js";

const program = new Command();

program.name("nhim-audit").description("Agent execution path audit for Kubernetes").version(VERSION);

function computeExitCode(
  fullReport: AuditReport,
  opts: { failOn?: string; minScore?: number; baseline?: string },
): number {
  if (opts.baseline) {
    const baseline = readReport(opts.baseline);
    if (diffAgainstBaseline(fullReport, baseline).length > 0) return 1;
    return 0;
  }
  if (opts.failOn && shouldFail(fullReport, opts.failOn as FailOnLevel)) return 1;
  if (opts.minScore !== undefined && !meetsMinScore(fullReport, opts.minScore)) return 1;
  return 0;
}

program
  .command("audit")
  .description("Run static NHIM audit against a cluster")
  .option("--kubeconfig <path>", "Path to kubeconfig")
  .option("--context <name>", "Kubeconfig context")
  .option("--namespace <ns...>", "Limit to namespaces")
  .option("--fixture <name>", "Use fixture cluster (broken|fixed|empty)")
  .option("--label-selector <sel>", "Additional label selector")
  .option("--include-pods", "Merge live pod env into workload candidates (post-inject Auto-Route)")
  .option("--probe", "Run active probe tests (requires BLEKLINE_EVAL_TOKEN)")
  .option("--eval-token <token>", "Eval token (or env BLEKLINE_EVAL_TOKEN)")
  .option("-o, --output <path>", "Write report to path (JSON or SARIF per --format)")
  .option("--json", "JSON output only")
  .option("--format <fmt>", "Output format: json|sarif", "json")
  .option("--plain", "Plain output for CI")
  .option("--brand", "Show NHIM AUDIT brand subline")
  .option("--wide", "Wide layout")
  .option("--verbose", "Verbose finding cards")
  .option("--no-color", "Disable color")
  .option("--fail-on <level>", "Exit 1 on critical|high|any", "high")
  .option("--min-score <n>", "Exit 1 if score below n", parseInt)
  .option("--baseline <path>", "Exit 1 only on new findings vs baseline JSON")
  .option("--only-critical", "Show only CRITICAL findings")
  .option("--min-severity <sev>", "Minimum severity to display")
  .action(async (opts) => {
    try {
      const cluster = await loadClusterSnapshot({
        kubeconfig: opts.kubeconfig,
        context: opts.context,
        fixture: opts.fixture,
        namespaces: opts.namespace,
        includeKubeSystem: opts.includeKubeSystem,
        includePods: opts.includePods,
      });

      let fullReport = runAudit(cluster, {
        discover: { labelSelector: opts.labelSelector },
        probe: false,
      });

      const evalToken = opts.evalToken ?? process.env.BLEKLINE_EVAL_TOKEN;
      if (opts.probe) {
        const v = await validateEvalToken(evalToken ?? "", {
          online: process.env.BLEKLINE_EVAL_ONLINE === "1",
        });
        if (!v.valid) {
          if (opts.json || opts.format === "sarif") {
            console.error(JSON.stringify({ error: v.reason }));
          } else {
            console.error(v.reason);
          }
          process.exit(2);
        }
        fullReport = await runProbes(fullReport, cluster, evalToken!, {
          fixture: opts.fixture,
          kubeconfig: opts.kubeconfig,
          context: opts.context,
        });
      }

      if (opts.output) {
        const out =
          opts.format === "sarif" ? reportToSarif(fullReport) : reportToJson(fullReport);
        writeFileSync(opts.output, out, "utf8");
      }

      let displayReport = fullReport;
      if (opts.baseline) {
        const baseline = readReport(opts.baseline);
        const newFindings = diffAgainstBaseline(fullReport, baseline);
        displayReport = { ...fullReport, findings: newFindings };
      }

      displayReport = {
        ...displayReport,
        findings: filterFindings(displayReport.findings, {
          onlyCritical: opts.onlyCritical,
          minSeverity: opts.minSeverity as Severity | undefined,
        }),
      };

      const machineOut = opts.format === "sarif";
      if (opts.json || machineOut) {
        const out = machineOut ? reportToSarif(fullReport) : reportToJson(fullReport);
        console.log(out);
      } else {
        console.log(
          renderTerminal(displayReport, {
            plain: opts.plain ?? opts.noColor,
            brand: opts.brand,
            verbose: opts.verbose,
            wide: opts.wide,
          }),
        );
      }

      process.exit(computeExitCode(fullReport, opts));
    } catch (e) {
      if (e instanceof K8sLoadError) {
        console.error(e.message);
        process.exit(e.code);
      }
      throw e;
    }
  });

program
  .command("demo")
  .description("Run audit against a fixture cluster (broken|fixed|empty)")
  .argument("[fixture]", "Fixture name", "broken")
  .option("--plain", "Plain output")
  .action(async (fixture: string, opts: { plain?: boolean }) => {
    const name = ["broken", "fixed", "empty"].includes(fixture) ? fixture : "broken";
    const cluster = await loadClusterSnapshot({ fixture: name });
    const report = runAudit(cluster);
    console.log(renderTerminal(report, { plain: opts.plain, brand: true }));
  });

program
  .command("version")
  .description("Print version")
  .action(() => {
    console.log(`nhim-audit ${VERSION}`);
  });

program.parse();
