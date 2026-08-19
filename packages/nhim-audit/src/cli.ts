#!/usr/bin/env node
import { Command } from "commander";
import { writeFileSync } from "node:fs";
import { buildAuditConfig } from "./config/load.js";
import type { AuditProfileName } from "./config/profile.js";
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
import { resolveProbeToken, validateEvalToken, runProbes } from "./probe/index.js";
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

function validateProbeNamespaces(
  report: AuditReport,
  allowNamespaces: string[],
): string | null {
  if (!allowNamespaces.length) {
    return "--probe requires --probe-allow-namespaces (comma-separated eval namespace list)";
  }
  const candidateNs = [...new Set(report.candidates.map((c) => c.namespace))];
  const missing = candidateNs.filter((ns) => !allowNamespaces.includes(ns));
  if (missing.length > 0) {
    return `Probe not allowed in namespace(s): ${missing.join(", ")} — add to --probe-allow-namespaces`;
  }
  return null;
}

program
  .command("audit")
  .description("Run static NHIM audit against a cluster")
  .option("--kubeconfig <path>", "Path to kubeconfig")
  .option("--context <name>", "Kubeconfig context")
  .option("--namespace <ns...>", "Limit to namespaces")
  .option("--fixture <name>", "Use fixture cluster (broken|fixed|empty|hostnetwork-broken|fixed-generic|fixed-blekline|critical)")
  .option("--profile <name>", "Audit profile: generic|blekline", "generic")
  .option("--config <path>", "JSON config file (nhim-audit.example.json)")
  .option("--cluster-alias <name>", "Cluster label in JSON output (vendor handoff)")
  .option("--label-selector <sel>", "Additional label selector")
  .option("--custom-selector <kv...>", "Custom label selector key=value")
  .option("--include-pods", "Merge live pod env into workload candidates")
  .option("--probe", "Run active probe tests (requires NHIM_PROBE_TOKEN or BLEKLINE_EVAL_TOKEN)")
  .option("--probe-allow-namespaces <ns...>", "Namespaces allowed for probe exec (required with --probe)")
  .option("--eval-token <token>", "Probe token (or env NHIM_PROBE_TOKEN / BLEKLINE_EVAL_TOKEN)")
  .option("-o, --output <path>", "Write report to path (JSON or SARIF per --format)")
  .option("--json", "JSON output only")
  .option("--format <fmt>", "Output format: json|sarif", "json")
  .option("--plain", "Plain output for CI")
  .option("--brand", "Show BLEKLINE wordmark (blekline profile)")
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
      const customSelector: Record<string, string> = {};
      for (const pair of opts.customSelector ?? []) {
        const [k, v] = pair.split("=");
        if (k && v) customSelector[k] = v;
      }

      const config = buildAuditConfig({
        profile: opts.profile as AuditProfileName,
        configPath: opts.config,
        clusterAlias: opts.clusterAlias,
        probeAllowNamespaces: opts.probeAllowNamespaces,
        labelSelector: opts.labelSelector,
      });

      const cluster = await loadClusterSnapshot({
        kubeconfig: opts.kubeconfig,
        context: opts.context,
        fixture: opts.fixture,
        namespaces: opts.namespace,
        includePods: opts.includePods,
        clusterAlias: opts.clusterAlias,
      });

      const probeToken = resolveProbeToken(opts.evalToken);
      let fullReport = runAudit(cluster, {
        config,
        discover: { labelSelector: opts.labelSelector, customSelector },
        probe: false,
        probeTokenPresent: Boolean(probeToken),
      });

      if (opts.probe) {
        const nsErr = validateProbeNamespaces(fullReport, config.probe.allowNamespaces);
        if (nsErr) {
          if (opts.json || opts.format === "sarif") {
            console.error(JSON.stringify({ error: nsErr }));
          } else {
            console.error(nsErr);
          }
          process.exit(2);
        }

        const v = await validateEvalToken(probeToken ?? "", {
          online: process.env.BLEKLINE_EVAL_ONLINE === "1",
          profile: config.profile,
        });
        if (!v.valid) {
          if (opts.json || opts.format === "sarif") {
            console.error(JSON.stringify({ error: v.reason }));
          } else {
            console.error(v.reason);
          }
          process.exit(2);
        }
        fullReport = await runProbes(fullReport, cluster, probeToken!, {
          fixture: opts.fixture,
          kubeconfig: opts.kubeconfig,
          context: opts.context,
          config,
          validatedOnline: v.validatedOnline === true,
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
            brand: opts.brand ?? config.profile === "blekline",
            verbose: opts.verbose,
            wide: opts.wide,
            suppressVendorCta: config.output.suppressVendorCta,
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
  .description("Run audit against a fixture cluster")
  .argument("[fixture]", "Fixture name", "broken")
  .option("--plain", "Plain output")
  .option("--profile <name>", "Audit profile", "generic")
  .action(async (fixture: string, opts: { plain?: boolean; profile?: string }) => {
    const allowed = ["broken", "fixed", "empty", "hostnetwork-broken", "fixed-generic", "fixed-blekline", "critical"];
    const name = allowed.includes(fixture) ? fixture : "broken";
    const config = buildAuditConfig({ profile: opts.profile as AuditProfileName });
    const cluster = await loadClusterSnapshot({ fixture: name });
    const report = runAudit(cluster, { config });
    console.log(
      renderTerminal(report, {
        plain: opts.plain,
        brand: config.profile === "blekline",
        suppressVendorCta: config.output.suppressVendorCta,
      }),
    );
  });

program
  .command("version")
  .description("Print version")
  .action(() => {
    console.log(`nhim-audit ${VERSION}`);
  });

program.parse();
