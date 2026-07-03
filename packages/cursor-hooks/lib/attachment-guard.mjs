import { isSensitivePath } from "./sensitive-paths.mjs";

/**
 * @param {unknown} attachments
 * @returns {{ blocked: boolean, paths: string[] }}
 */
export function scanPromptAttachments(attachments) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return { blocked: false, paths: [] };
  }

  /** @type {string[]} */
  const paths = [];
  for (const item of attachments) {
    const filePath =
      typeof item?.file_path === "string"
        ? item.file_path
        : typeof item?.path === "string"
          ? item.path
          : "";
    if (filePath && isSensitivePath(filePath)) {
      paths.push(filePath);
    }
  }

  return { blocked: paths.length > 0, paths };
}
