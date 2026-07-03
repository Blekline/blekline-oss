import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { findWorkspaceRoot } from "./config.mjs";

function pendingDir(root) {
  const dir = join(root, ".blekline", "pending-mask");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function safeId(conversationId) {
  const hash = createHash("sha256").update(conversationId).digest("hex").slice(0, 32);
  return hash;
}

/**
 * @param {string} root
 * @param {string} conversationId
 * @returns {{ maskedText: string, requestId?: string, entitiesMasked: number } | null}
 */
export function readPendingMaskedPrompt(root, conversationId) {
  if (!conversationId) return null;
  const path = join(pendingDir(root), `${safeId(conversationId)}.json`);
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    if (typeof data?.maskedText !== "string") return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * @param {string} root
 * @param {string} conversationId
 * @param {{ maskedText: string, requestId?: string, entitiesMasked: number }} payload
 */
export function writePendingMaskedPrompt(root, conversationId, payload) {
  if (!conversationId) return;
  const path = join(pendingDir(root), `${safeId(conversationId)}.json`);
  writeFileSync(
    path,
    JSON.stringify({ ...payload, savedAt: new Date().toISOString() }, null, 2) + "\n"
  );
}

/**
 * @param {string} root
 * @param {string} conversationId
 */
export function clearPendingMaskedPrompt(root, conversationId) {
  if (!conversationId) return;
  const path = join(pendingDir(root), `${safeId(conversationId)}.json`);
  if (existsSync(path)) {
    try {
      unlinkSync(path);
    } catch {
      /* ignore */
    }
  }
}

/**
 * @param {object} input
 * @returns {string}
 */
export function conversationIdFromHookInput(input) {
  const id =
    (typeof input?.conversation_id === "string" && input.conversation_id) ||
    (typeof input?.session_id === "string" && input.session_id) ||
    "";
  return id.trim();
}

export function workspaceRootFromHookInput() {
  return findWorkspaceRoot(process.cwd());
}
