#!/usr/bin/env node
/**
 * Publish @blekline/* to npm; skip packages whose version is already on the registry.
 */
import { execSync } from "node:child_process";

const FILTERS = [
  "@blekline/contracts",
  "@blekline/client",
  "@blekline/mcp-server",
  "@blekline/mcp-proxy",
  "@blekline/cursor-hooks",
  "@blekline/nhim-audit",
];

function npmVersionPublished(name, version) {
  try {
    const out = execSync(`npm view ${name}@${version} version`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return out === version;
  } catch {
    return false;
  }
}

function packageVersion(filter) {
  return execSync(`pnpm --filter ${filter} exec node -p "require('./package.json').version"`, {
    encoding: "utf8",
  }).trim();
}

let published = 0;
let skipped = 0;

for (const filter of FILTERS) {
  const version = packageVersion(filter);
  const name = filter;
  if (npmVersionPublished(name, version)) {
    console.log(`skip ${name}@${version} (already on npm)`);
    skipped += 1;
    continue;
  }
  console.log(`publish ${name}@${version}`);
  execSync(`pnpm --filter ${filter} publish --access public --no-git-checks`, {
    stdio: "inherit",
  });
  published += 1;
}

console.log(`npm publish done: ${published} published, ${skipped} skipped`);
