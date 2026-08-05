import type { AuditReport } from "../types.js";
import { DOCS_RULE_BASE, rulesForProfile } from "../spec/rules.js";

/** SARIF 2.1 export (v2.0). */
export function reportToSarif(report: AuditReport): string {
  const catalog = rulesForProfile(report.profile);
  const sarif = {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: "nhim-audit",
            version: report.version,
            informationUri: DOCS_RULE_BASE,
            rules: catalog.map((spec) => ({
              id: spec.id,
              name: spec.title,
              shortDescription: { text: spec.title },
              fullDescription: { text: spec.description },
              helpUri: `${DOCS_RULE_BASE}#${spec.id}`,
              properties: { asi: spec.asi, severity: spec.severity, profile: report.profile },
            })),
          },
        },
        results: report.findings
          .filter((f) => f.id !== "NHIM-012")
          .map((f) => ({
            ruleId: f.id,
            level: f.severity === "CRITICAL" ? "error" : f.severity === "HIGH" ? "warning" : "note",
            message: { text: f.subtitle ? `${f.title} — ${f.subtitle}` : f.title },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: f.resource },
                },
              },
            ],
            properties: {
              namespace: f.namespace,
              asi: f.asi,
              evidence: f.evidence,
              schemaVersion: report.schemaVersion,
            },
          })),
      },
    ],
  };
  return JSON.stringify(sarif, null, 2);
}
