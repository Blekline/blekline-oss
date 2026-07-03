/** Shared sensitive path patterns for read / attachment / tool guards. */
export const SENSITIVE_PATH_RE =
  /(?:^|[\\/])\.env(?:\.|$)|(?:^|[\\/])\.env\.[^\\/]+$|(?:^|[\\/])[^\\/]*\.pem$|(?:^|[\\/])id_rsa(?:\.pub)?$|(?:^|[\\/])\.aws[\\/]credentials$|(?:^|[\\/])secrets[\\/]/i;

/**
 * @param {string} filePath
 * @returns {boolean}
 */
export function isSensitivePath(filePath) {
  if (!filePath || typeof filePath !== "string") return false;
  return SENSITIVE_PATH_RE.test(filePath);
}
