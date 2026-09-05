// MIME â†’ æ‰©å±•åæ˜ å°„ï¼Œç”¨äºŽåŽ†å²æ•°æ®æ²¡æœ‰æ‰©å±•åæ—¶å›žå¡«ï¼Œé¿å…ä¸‹è½½ä»¶æ— æ‰©å±•åæ‰“ä¸å¼€
const MIME_EXT: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/heic": ".heic",
  "text/plain": ".txt",
  "text/markdown": ".md",
  "text/csv": ".csv",
  "text/html": ".html",
  "application/json": ".json",
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "video/mp4": ".mp4",
  "audio/mpeg": ".mp3"
};

export function ensureExt(name: string, mimeType: string | null | undefined): string {
  if (/\.[A-Za-z0-9]{1,5}$/.test(name)) return name;
  if (!mimeType) return name;
  return name + (MIME_EXT[mimeType.toLowerCase()] ?? "");
}

export function isInlinePreviewable(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;
  const m = mimeType.toLowerCase();
  return (
    m === "application/pdf" ||
    m.startsWith("image/") ||
    m === "text/plain" ||
    m === "text/markdown" ||
    m === "text/csv" ||
    m === "text/html"
  );
}

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const XLS_MIME = "application/vnd.ms-excel";

/**
 * v0.42: æœåŠ¡ç«¯å¯è½¬ HTML é¢„è§ˆçš„ Office æ–‡æ¡£ç±»åž‹ã€‚
 * docx â†’ mammothï¼›xlsx/xls â†’ exceljsã€‚
 * è€ .doc(application/msword) æ— æ³•å¯é è½¬æ¢ â†’ å½’ nullï¼ˆé™çº§ä¸‹è½½ï¼‰ã€‚
 * mime å¯èƒ½ä¸å‡†ï¼Œæ•…åŒæ—¶çœ‹æ–‡ä»¶åæ‰©å±•ã€‚
 */
export function officePreviewKind(
  mimeType: string | null | undefined,
  name?: string | null
): "docx" | "xlsx" | null {
  const m = (mimeType ?? "").toLowerCase();
  const n = (name ?? "").toLowerCase();
  if (m === DOCX_MIME || n.endsWith(".docx")) return "docx";
  if (m === XLSX_MIME || m === XLS_MIME || n.endsWith(".xlsx") || n.endsWith(".xls"))
    return "xlsx";
  return null;
}

/** èƒ½åœ¨çº¿æ‰“å¼€æŸ¥é˜…ï¼ˆå†…åµŒ inline æˆ–æœåŠ¡ç«¯è½¬ HTMLï¼‰ï¼Œç”¨äºŽå‰ç«¯å†³å®šæ˜¯å¦ç»™"æ‰“å¼€"å…¥å£ */
export function canPreview(
  mimeType: string | null | undefined,
  name?: string | null
): boolean {
  return isInlinePreviewable(mimeType) || officePreviewKind(mimeType, name) !== null;
}

