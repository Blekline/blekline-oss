#!/usr/bin/env node
/**
 * Headless CI: VS Code extension package contract.
 * Confirms contributes.chatParticipants exists (required for @blekline).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(root, "..", "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

function fail(message, detail) {
  console.error(`vscode-extension-smoke failed: ${message}`);
  if (detail !== undefined) console.error(detail);
  process.exit(1);
}

if (pkg.publisher !== "blekline" || pkg.name !== "blekline" || pkg.displayName !== "Blekline") {
  fail("publisher/name/displayName contract mismatch", {
    publisher: pkg.publisher,
    name: pkg.name,
    displayName: pkg.displayName,
  });
}

const participants = pkg.contributes?.chatParticipants;
if (!Array.isArray(participants) || participants.length === 0) {
  fail("contributes.chatParticipants missing");
}

const participant = participants.find((entry) => entry?.id === "blekline.blekline");
if (!participant) {
  fail("chat participant id blekline.blekline missing", participants);
}
if (participant.name !== "blekline" || participant.isSticky !== true) {
  fail("chat participant name/isSticky contract mismatch", participant);
}

const commands = Array.isArray(pkg.contributes?.commands)
  ? pkg.contributes.commands.map((entry) => entry.command)
  : [];
for (const command of ["blekline.setup", "blekline.verify", "blekline.openActivity"]) {
  if (!commands.includes(command)) {
    fail(`command ${command} missing`, commands);
  }
}

console.log("vscode-extension-smoke OK");
