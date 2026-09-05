// å†…éƒ¨ helperï¼šä»…ä¾› server action è°ƒç”¨ï¼Œè°ƒç”¨æ–¹è´Ÿè´£ session yæƒé™æ ¡éªŒã€‚
// ä¸èƒ½æ ‡ "use server"ï¼šè¿™é‡ŒæŽ¥å— userId/matterId å‚æ•°ä¸”ä¸åšé‰´æƒï¼Œ
// ä¸€æ—¦æˆä¸º server action ç«¯ç‚¹ä¼šè¢«Clienteç«¯ç›´æŽ¥ä¼ªé€ è°ƒç”¨ã€‚
import { lookup } from "node:dns/promises";
import net from "node:net";
import type { DocumentCategory, SmsType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { encryptBuffer, sha256 } from "@/lib/storage/crypto";
import { ensureExt } from "@/lib/storage/mime-ext";
import { normalizeUploadedFilename } from "@/lib/filename";
import { audit } from "@/server/audit";
import { assertDocumentWritable } from "@/lib/archive/guard";
import type {
  ParsedSms,
  SmsAttachmentResult,
  SmsDocumentLink
} from "@/lib/sms-parser";

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 4;
const MAX_PAGE_FILE_CANDIDATES = 5;

const FILE_EXTS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "tiff",
  "zip",
  "rar",
  "7z"
] as const;

const FILE_EXT_RE = new RegExp(`\\.(${FILE_EXTS.join("|")})(?:[?#]|$)`, "i");

const MIME_EXT: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/bmp": ".bmp",
  "image/tiff": ".tiff",
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip",
  "application/x-rar-compressed": ".rar",
  "application/x-7z-compressed": ".7z"
};

type DownloadContext = {
  smsId: string;
  userId: string;
  matterId: string;
  procedureId: string | null;
  smsType: SmsType;
};

export async function downloadSmsAttachments({
  smsId,
  userId,
  parsed,
  matterId,
  procedureId
}: {
  smsId: string;
  userId: string;
  parsed: ParsedSms;
  matterId: string;
  procedureId: string | null;
}): Promise<SmsAttachmentResult[]> {
  await assertDocumentWritable(matterId, { kind: "upload" });

  const links = parsed.documentLinks.length > 0
    ? parsed.documentLinks
    : parsed.urls.map((url) => ({
        url,
        platform: null,
        credentials: [],
        requiresLogin: false,
        extractionCodes: []
      }));

  const results: SmsAttachmentResult[] = [];
  for (const link of links) {
    const result = await downloadFromDocumentLink(link, {
      smsId,
      userId,
      matterId,
      procedureId,
      smsType: parsed.smsType
    });
    results.push(result);
  }
  return results;
}

async function downloadFromDocumentLink(
  link: SmsDocumentLink,
  ctx: DownloadContext
): Promise<SmsAttachmentResult> {
  try {
    const result = await downloadFromUrl(link.url, ctx, new Set<string>());
    if (
      link.requiresLogin &&
      (result.status === "NO_FILE_FOUND" || result.status === "UNSUPPORTED_TYPE")
    ) {
      return {
        url: link.url,
        status: "LOGIN_REQUIRED",
        message: link.extractionCodes.length > 0
          ? "è¯¥é€è¾¾å…¥å£å¯èƒ½éœ€è¦Iniciar sesiÃ³næˆ–è¾“å…¥æå–ç ï¼Œå·²è¯†åˆ«åˆ°SMSå†…çš„éªŒè¯ç /æå–ç "
          : "è¯¥é€è¾¾å…¥å£å¯èƒ½éœ€è¦ç½‘é¡µIniciar sesiÃ³nã€éªŒè¯ç æˆ–ä¸“æœ‰æµç¨‹ï¼Œéœ€äººå·¥æ‰“å¼€å¤„ç†",
        checkedAt: new Date().toISOString()
      };
    }
    return result;
  } catch (err) {
    return {
      url: link.url,
      status: "FAILED",
      message: err instanceof Error ? err.message : "Adjuntoæå–Error",
      checkedAt: new Date().toISOString()
    };
  }
}

async function downloadFromUrl(
  url: string,
  ctx: DownloadContext,
  visited: Set<string>
): Promise<SmsAttachmentResult> {
  if (visited.has(url)) {
    return {
      url,
      status: "FAILED",
      message: "Enlaceè·³è½¬å¾ªçŽ¯ï¼Œå·²åœæ­¢",
      checkedAt: new Date().toISOString()
    };
  }
  visited.add(url);

  const { response, finalUrl } = await fetchWithRedirects(url);
  if (!response.ok) {
    return {
      url,
      status: "FAILED",
      message: `è®¿é—®Errorï¼šHTTP ${response.status}`,
      checkedAt: new Date().toISOString()
    };
  }

  const contentType = baseMime(response.headers.get("content-type"));
  const contentLength = parseInt(response.headers.get("content-length") ?? "0", 10);
  if (contentType === "text/html" || finalUrl.toLowerCase().includes(".html")) {
    if (contentLength > MAX_HTML_BYTES) {
      return {
        url,
        status: "NO_FILE_FOUND",
        message: "é€è¾¾é¡µé¢è¿‡å¤§ï¼Œæœªè‡ªåŠ¨è§£æžé¡µé¢å†…Adjunto",
        checkedAt: new Date().toISOString()
      };
    }
    const html = await response.text();
    const candidates = extractFileLinksFromHtml(html, finalUrl).slice(0, MAX_PAGE_FILE_CANDIDATES);
    for (const candidate of candidates) {
      const result = await downloadFromUrl(candidate, ctx, visited);
      if (result.status === "DOWNLOADED" || result.status === "ALREADY_DOWNLOADED") {
        return { ...result, url };
      }
    }
    return {
      url,
      status: htmlLooksLikeLogin(html) ? "LOGIN_REQUIRED" : "NO_FILE_FOUND",
      message: htmlLooksLikeLogin(html)
        ? "é¡µé¢éœ€è¦Iniciar sesiÃ³nã€éªŒè¯ç æˆ–Confirmarç­¾æ”¶ï¼Œæœªè‡ªåŠ¨ä¸‹è½½"
        : "é¡µé¢å†…æœªå‘çŽ°å¯ç›´æŽ¥ä¸‹è½½çš„æ–‡ä¹¦Adjunto",
      checkedAt: new Date().toISOString()
    };
  }

  if (!isSupportedFile(contentType, finalUrl)) {
    return {
      url,
      status: "UNSUPPORTED_TYPE",
      message: contentType ? `Enlaceä¸æ˜¯æ”¯æŒçš„æ–‡ä¹¦æ–‡ä»¶ï¼š${contentType}` : "Enlaceä¸æ˜¯å¯è¯†åˆ«çš„æ–‡ä¹¦æ–‡ä»¶",
      checkedAt: new Date().toISOString()
    };
  }
  if (contentLength > MAX_ATTACHMENT_BYTES) {
    return {
      url,
      status: "FAILED",
      message: "Adjuntoè¶…è¿‡ 20MB é™åˆ¶",
      checkedAt: new Date().toISOString()
    };
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_ATTACHMENT_BYTES) {
    return {
      url,
      status: "FAILED",
      message: "Adjuntoè¶…è¿‡ 20MB é™åˆ¶",
      checkedAt: new Date().toISOString()
    };
  }
  if (buffer.length === 0) {
    return {
      url,
      status: "FAILED",
      message: "Adjuntoä¸ºç©º",
      checkedAt: new Date().toISOString()
    };
  }

  const hash = sha256(buffer);
  const existing = await prisma.document.findFirst({
    where: {
      matterId: ctx.matterId,
      sha256: hash,
      deletedAt: null
    },
    select: { id: true, name: true, mimeType: true, size: true }
  });
  if (existing) {
    return {
      url,
      status: "ALREADY_DOWNLOADED",
      message: "è¯¥Adjuntoå·²åœ¨æœ¬æ¡ˆææ–™ä¸­",
      documentId: existing.id,
      documentName: existing.name,
      mimeType: existing.mimeType,
      size: existing.size ?? undefined,
      checkedAt: new Date().toISOString()
    };
  }

  const filename = buildAttachmentName(response, finalUrl);
  const document = await saveAttachmentDocument({
    ctx,
    buffer,
    filename,
    mimeType: contentType || "application/octet-stream",
    hash
  });

  return {
    url,
    status: "DOWNLOADED",
    message: "å·²Guardarä¸ºCasoææ–™",
    documentId: document.id,
    documentName: document.name,
    mimeType: document.mimeType,
    size: document.size ?? undefined,
    checkedAt: new Date().toISOString()
  };
}

async function fetchWithRedirects(url: string): Promise<{ response: Response; finalUrl: string }> {
  let current = url;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const safeUrl = await assertSafeHttpUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
    try {
      const response = await fetch(safeUrl.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "LawLink/1.0 court-sms-attachment-fetcher",
          Accept: "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*,application/zip,*/*;q=0.8"
        }
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return { response, finalUrl: safeUrl.toString() };
        current = new URL(location, safeUrl).toString();
        continue;
      }
      return { response, finalUrl: safeUrl.toString() };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Enlaceé‡å®šå‘æ¬¡æ•°è¿‡å¤š");
}

async function assertSafeHttpUrl(input: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Enlaceæ ¼å¼ä¸æ­£ç¡®");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("ä»…æ”¯æŒ HTTP/HTTPS Enlace");
  }
  if (isLocalHostname(url.hostname)) {
    throw new Error("ä¸å…è®¸è®¿é—®æœ¬æœºæˆ–å†…ç½‘åœ°å€");
  }
  const records = await lookup(url.hostname, { all: true });
  if (records.length === 0 || records.some((r) => isPrivateAddress(r.address))) {
    throw new Error("ä¸å…è®¸è®¿é—®æœ¬æœºæˆ–å†…ç½‘åœ°å€");
  }
  return url;
}

function isLocalHostname(hostname: string) {
  const host = hostname.toLowerCase();
  return host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local");
}

function isPrivateAddress(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map((v) => parseInt(v, 10));
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  if (net.isIPv6(address)) {
    const low = address.toLowerCase();
    return low === "::1" || low.startsWith("fc") || low.startsWith("fd") || low.startsWith("fe80:");
  }
  return true;
}

function extractFileLinksFromHtml(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const attrPattern = /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  for (const m of html.matchAll(attrPattern)) {
    const raw = m[1]?.trim();
    if (!raw || raw.startsWith("javascript:") || raw.startsWith("#")) continue;
    const next = new URL(raw, baseUrl).toString();
    if (FILE_EXT_RE.test(next)) urls.push(next);
  }
  const inlinePattern = /https?:\/\/[^\s"'<>]+/gi;
  for (const m of html.matchAll(inlinePattern)) {
    const raw = m[0]?.trim();
    if (raw && FILE_EXT_RE.test(raw)) urls.push(raw);
  }
  return Array.from(new Set(urls));
}

function htmlLooksLikeLogin(html: string): boolean {
  return /Iniciar sesiÃ³n|è´¦å·|ContraseÃ±a|éªŒè¯ç |ç­¾æ”¶|Confirmaré€è¾¾|æå–ç |å–ä»¶ç |äººæœº|captcha/i.test(html);
}

function baseMime(mime: string | null): string | null {
  if (!mime) return null;
  return mime.split(";")[0]?.trim().toLowerCase() || null;
}

function isSupportedFile(mimeType: string | null, url: string): boolean {
  if (mimeType && MIME_EXT[mimeType]) return true;
  if (mimeType?.startsWith("image/")) return true;
  return FILE_EXT_RE.test(url);
}

function buildAttachmentName(response: Response, finalUrl: string): string {
  const dispositionName = filenameFromDisposition(response.headers.get("content-disposition"));
  const urlName = filenameFromUrl(finalUrl);
  const mimeType = baseMime(response.headers.get("content-type"));
  const base = sanitizeFilename(normalizeUploadedFilename(dispositionName || urlName || "æ³•é™¢SMSé€è¾¾æ–‡ä¹¦"));
  const withExt = ensureExt(base, mimeType);
  if (/\.[A-Za-z0-9]{1,5}$/.test(withExt)) return withExt;
  const ext = mimeType ? MIME_EXT[mimeType] : null;
  return `${withExt}${ext ?? ".bin"}`;
}

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = header.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ""));
    } catch {
      return star[1].trim().replace(/^"|"$/g, "");
    }
  }
  const plain = header.match(/filename\s*=\s*"?([^";]+)"?/i);
  return plain?.[1]?.trim() ?? null;
}

function filenameFromUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const name = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "");
    return name || null;
  } catch {
    return null;
  }
}

function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return (cleaned || "æ³•é™¢SMSé€è¾¾æ–‡ä¹¦").slice(0, 120);
}

async function saveAttachmentDocument({
  ctx,
  buffer,
  filename,
  mimeType,
  hash
}: {
  ctx: DownloadContext;
  buffer: Buffer;
  filename: string;
  mimeType: string;
  hash: string;
}) {
  const encrypted = Boolean(process.env.STORAGE_ENCRYPTION_KEY);
  let stored = buffer;
  let iv: string | null = null;
  let authTag: string | null = null;
  let algorithm: string | null = null;
  if (encrypted) {
    const enc = encryptBuffer(buffer);
    stored = enc.ciphertext;
    iv = enc.iv.toString("base64");
    authTag = enc.authTag.toString("base64");
    algorithm = enc.algorithm;
  }

  const path = await storage.writeFile(`m_${ctx.matterId}`, stored);
  const doc = await prisma.document.create({
    data: {
      matterId: ctx.matterId,
      procedureId: ctx.procedureId,
      name: filename,
      category: categoryForSmsAttachment(ctx.smsType, filename),
      path,
      mimeType,
      size: buffer.length,
      sha256: hash,
      encrypted,
      algorithm,
      iv,
      authTag,
      tags: ["æ³•é™¢SMS", "ç”µå­é€è¾¾", "è‡ªåŠ¨æå–"],
      uploadedById: ctx.userId
    },
    select: { id: true, name: true, mimeType: true, size: true }
  });

  await prisma.timelineEvent.create({
    data: {
      matterId: ctx.matterId,
      eventType: "DOCUMENT_UPLOADED",
      title: `æå–æ³•é™¢SMSAdjuntoï¼š${filename}`,
      occurredAt: new Date(),
      refType: "Document",
      refId: doc.id
    }
  });

  await audit({
    userId: ctx.userId,
    action: "SMS_ATTACHMENT_DOWNLOAD",
    targetType: "Document",
    targetId: doc.id,
    detail: { smsId: ctx.smsId, matterId: ctx.matterId, name: filename, size: buffer.length }
  });

  return doc;
}

function categoryForSmsAttachment(smsType: SmsType, filename: string): DocumentCategory {
  if (smsType === "JUDGMENT_NOTICE" || /åˆ¤å†³|è£å®š|è£åˆ¤|è°ƒè§£ä¹¦/.test(filename)) return "JUDGMENT";
  if (smsType === "EVIDENCE_SUBMIT" || /è¯æ®|ææ–™|ä¸¾è¯/.test(filename)) return "EVIDENCE";
  if (/èµ·è¯‰|ç­”è¾©|ä¸Šè¯‰|ç”³è¯·ä¹¦|åè¯‰|ä»£ç†è¯|æ„è§/.test(filename)) return "PLEADING";
  if (smsType === "SERVICE_NOTICE" || smsType === "FILING_NOTICE" || smsType === "FEE_NOTICE") return "PROCEDURE";
  return "OTHER";
}


