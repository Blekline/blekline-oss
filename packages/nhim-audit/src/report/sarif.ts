import type { AuditReport } from "../types.js";

/** SARIF 2.1 export (v1.1). */
export function reportToSarif(report: AuditReport): string {
  const rules = [...new Map(report.findings.map((f) => [f.id, f])).values()];
  const sarif = {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: "nhim-audit",
            version: report.version,
            informationUri: "https://app.blekline.com/docs/tools/nhim-audit",
            rules: rules.map((f) => ({
              id: f.id,
              name: f.title,
              shortDescription: { text: f.title },
              properties: { asi: f.asi, severity: f.severity },
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
            properties: { namespace: f.namespace, asi: f.asi, evidence: f.evidence },
          })),
      },
    ],
  };
  return JSON.stringify(sarif, null, 2);
}
