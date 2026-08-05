#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RBAC_DIR = join(dirname(fileURLToPath(import.meta.url)), "../packages/nhim-audit/deploy/rbac");

function loadYaml(path) {
  return readFileSync(path, "utf8");
}

let failed = false;

for (const file of readdirSync(RBAC_DIR).filter((f) => f.endsWith(".yaml"))) {
  const content = loadYaml(join(RBAC_DIR, file));
  if (file === "nhim-audit-reader-namespaced.yaml") {
    if (/ClusterRole/.test(content)) {
      console.error(`${file}: namespaced reader must use Role, not ClusterRole`);
      failed = true;
    }
    if (/secrets.*list/i.test(content) && /ClusterRole/.test(content)) {
      console.error(`${file}: must not cluster-list secrets`);
      failed = true;
    }
  }
  if (file === "nhim-audit-probe-namespaced.yaml") {
    if (!content.includes("pods/exec")) {
      console.error(`${file}: missing pods/exec`);
      failed = true;
    }
    if (content.includes("kube-system")) {
      console.error(`${file}: must not bind kube-system`);
      failed = true;
    }
  }
  if (file === "nhim-audit-reader-cluster.yaml") {
    if (!content.includes("mutatingwebhookconfigurations")) {
      console.error(`${file}: missing webhook read permissions`);
      failed = true;
    }
    if (/secrets/i.test(content)) {
      console.error(`${file}: cluster reader must not list secrets cluster-wide`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log("RBAC manifest validation OK");
