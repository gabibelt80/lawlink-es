/**
 * ä¸Šä¼ æ–‡ä»¶ç±»åž‹æ ¡éªŒ
 *
 * ä¸‰é“é—¸ï¼š
 *   1. æ–‡ä»¶åæ‰©å±•åå¿…é¡»åœ¨ç™½åå•å†…ï¼ˆä¸åŒºåˆ†å¤§å°å†™ï¼‰
 *   2. MIME ä¸ä¸ºç©ºæ—¶ä¹Ÿè¦åœ¨ç™½åå•å†…ï¼ˆæµè§ˆå™¨å¯ä¼ªé€ ä½†ä½œä¸ºè¾…åŠ©ï¼‰
 *   3. æ–‡ä»¶å¤§å° â‰¤ maxBytes
 *
 * æ•…æ„ä¸è¯» magic bytesï¼šsniffing å¢žåŠ å¤æ‚åº¦ä½†ç»•è¿‡é—¨æ§›åªæ˜¯ç¨å¾®æé«˜ï¼Œ
 * æŠ•å…¥äº§å‡ºæ¯”ä¸é«˜ã€‚æœ¬Sistemaå‡è®¾æ˜¯å¾‹æ‰€å†…éƒ¨ä½¿ç”¨ï¼Œä¸»è¦é˜²æ­¢æ„å¤–ï¼ˆè¯¯ä¼  .exeï¼‰
 * è€Œéžå¯¹æŠ—ä¸»åŠ¨æ”»å‡»ã€‚
 */

export type UploadPurpose = "document" | "invoice" | "seal" | "stamp";

const DOC_EXT = [
  "pdf",
  "doc", "docx",
  "xls", "xlsx",
  "ppt", "pptx",
  "txt",
  "jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff",
  "zip", "rar", "7z",
  "mp3", "wav", "m4a",
  "mp4", "mov", "avi"
];

// Factura / ç”¨ç« åœºæ™¯æ›´çª„ï¼šä»…å›¾ç‰‡æˆ– PDF
const NARROW_EXT = ["pdf", "jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff"];

const ALLOWED: Record<UploadPurpose, Set<string>> = {
  document: new Set(DOC_EXT),
  invoice: new Set(NARROW_EXT),
  seal: new Set(DOC_EXT), // å¾…ç›–ç« ç¨¿å…è®¸ docx/pdf
  stamp: new Set(NARROW_EXT) // ç›–ç« åŽæ‰«æä»¶åªå…è®¸å›¾ç‰‡ / PDF
};

const MIME_PREFIX_OK: Record<UploadPurpose, RegExp> = {
  document: /^(application|image|audio|video|text)\//,
  invoice: /^(image\/|application\/pdf)/,
  seal: /^(application|image)\//,
  stamp: /^(image\/|application\/pdf)/
};

function getExt(filename: string): string {
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

export interface FileValidationOptions {
  purpose: UploadPurpose;
  maxBytes: number;
}

/**
 * æŠ›ä¸­æ–‡å¼‚å¸¸ï¼ˆå‰ç«¯ toast ç›´æŽ¥æ˜¾ç¤ºï¼‰ï¼›AprobarVolverå½’ä¸€åŒ–çš„ ext ç»™ä¸Šå±‚ç”¨ä½œå­˜å‚¨è·¯å¾„æˆ–æ—¥å¿—ã€‚
 */
export function validateUploadedFile(
  file: File,
  opts: FileValidationOptions
): { ext: string } {
  if (file.size === 0) throw new Error("æ–‡ä»¶ä¸ºç©º");
  if (file.size > opts.maxBytes) {
    throw new Error(
      `æ–‡ä»¶è¶…è¿‡ ${Math.round(opts.maxBytes / 1024 / 1024)}MB é™åˆ¶`
    );
  }
  const ext = getExt(file.name);
  if (!ext) throw new Error(`æ–‡ä»¶åç¼ºå°‘æ‰©å±•åï¼š${file.name}`);
  if (!ALLOWED[opts.purpose].has(ext)) {
    throw new Error(
      `ä¸å…è®¸çš„æ–‡ä»¶ç±»åž‹ï¼š.${ext}ï¼ˆ${opts.purpose}ï¼‰`
    );
  }
  if (file.type && !MIME_PREFIX_OK[opts.purpose].test(file.type)) {
    throw new Error(
      `MIME ç±»åž‹yæ‰©å±•åä¸ä¸€è‡´æˆ–ä¸åœ¨ç™½åå•ï¼š${file.type}`
    );
  }
  return { ext };
}

