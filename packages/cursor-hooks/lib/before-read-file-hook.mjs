import { isSensitivePath } from "./sensitive-paths.mjs";

/**
 * @param {object} input
 * @param {import('./config.mjs').CursorHookConfig} config
 */
export function runBeforeReadFileHook(input, config) {
  if (!config.readGuard) {
    return { permission: "allow" };
  }

  const filePath = typeof input?.file_path === "string" ? input.file_path : "";
  if (!filePath) {
    return { permission: "allow" };
  }

  if (isSensitivePath(filePath)) {
    return {
      permission: "deny",
      user_message:
        "Blekline blocked reading a sensitive file path (.env, keys, secrets). Use blekline_mask_prompt on redacted excerpts instead.",
    };
  }

  return { permission: "allow" };
}
