import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * @param {string} cwd
 */
export function detectClients(cwd) {
  const cursor = existsSync(join(cwd, ".cursor")) || existsSync(join(cwd, ".cursor-plugin"));
  const claude =
    existsSync(join(cwd, ".claude")) ||
    existsSync(join(cwd, "CLAUDE.md")) ||
    existsSync(join(cwd, ".claude/settings.json")) ||
    existsSync(join(cwd, ".claude/settings.json.example"));
  const codex = existsSync(join(cwd, ".codex")) || existsSync(join(cwd, ".codex-plugin"));
  return { cursor, claude, codex };
}
