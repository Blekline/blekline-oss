/**
 * @param {import('./config.mjs').CursorHookConfig} config
 * @param {string} [message]
 */
export function permissionOnHookError(config, message) {
  if (config.failClosed) {
    return {
      permission: "deny",
      user_message: message ?? "Blekline hook failed (fail-closed). Action blocked.",
    };
  }
  return { permission: "allow" };
}

/**
 * @param {import('./config.mjs').CursorHookConfig} config
 * @param {string} [message]
 */
export function continueOnHookError(config, message) {
  if (config.failClosed) {
    return {
      continue: false,
      user_message: message ?? "Blekline hook failed (fail-closed). Prompt blocked.",
    };
  }
  return { continue: true };
}

export async function readHookStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw);
}
