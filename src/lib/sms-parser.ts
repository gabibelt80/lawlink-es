/**
 * v0.9 æ³•é™¢SMSè§£æžï¼ˆTypeScript å®žçŽ°ï¼Œå¯¹åº”æ—§Sistema server.py çš„ parse_sms_regexï¼‰
 *
 * ç”¨æ³•ï¼š
 *   const parsed = parseSms(rawText);
 *   parsed.smsType / parsed.caseNumbers / parsed.hearingDate ...
 *
 * æ­¤æ–‡ä»¶**çº¯æ­£åˆ™ + çº¯ helper**ï¼Œæ—  node:* / server-only ä¾èµ–ï¼Œclient å¯ importã€‚
 * AI å¢žå¼ºè§ `sms-parser-ai.ts`ï¼ˆserver-onlyï¼‰ã€‚
 */
import type { SmsType } from "@prisma/client";

export interface SmsPlatformHint {
  keyword: string;
  label: string;
}

const COURT_PLATFORMS: SmsPlatformHint[] = [
  { keyword: "zhixun", label: "æ™ºè¯‰æœåŠ¡" },
  { keyword: "hbfy", label: "æ¹–åŒ—æ³•é™¢ç”µå­é€è¾¾" },
  { keyword: "hbcourt", label: "æ¹–åŒ—æ³•é™¢ç”µå­é€è¾¾" },
  { keyword: "e-court", label: "äººæ°‘æ³•é™¢ç”µå­é€è¾¾" },
  { keyword: "court.gov.cn", label: "äººæ°‘æ³•é™¢åœ¨çº¿æœåŠ¡" },
  { keyword: "songda", label: "ç”µå­é€è¾¾" },
  { keyword: "12368", label: "12368 è¯‰è®¼æœåŠ¡" },
  { keyword: "rmfyaj", label: "äººæ°‘æ³•é™¢Casoåº“" }
];

export interface ParsedSms {
  smsType: SmsType;
  caseNumbers: string[];
  court: string | null;
  // å®Œæ•´Fechaæ—¶é—´å­—ç¬¦ä¸²æ•°ç»„ï¼ˆä¿ç•™åŽŸæ–‡æ ¼å¼ï¼ŒUI å‹å¥½æ˜¾ç¤ºï¼‰
  dates: string[];
  // æŽ¨æµ‹å¼€åº­æ—¶é—´ï¼ˆå– SMS ä¸­ç¬¬ä¸€ä¸ªå«æ—¶åˆ†çš„Fechaï¼Œå¼€åº­Notificacionesåœºæ™¯æ‰æœ‰æ„ä¹‰ï¼‰
  hearingDate: string | null;
  filingDate: string | null;
  judgmentDate: string | null;
  appealDeadline: string | null; // "15æ—¥"
  courtRoom: string | null;
  judge: string | null;
  clerk: string | null;
  phones: string[];
  amounts: string[];
  urls: string[];
  platforms: string[];
  importantItems: SmsImportantItem[];
  credentials: SmsCredential[];
  documentLinks: SmsDocumentLink[];
  attachmentResults: SmsAttachmentResult[];
  summary: string;
  // v0.9.1 AI å¢žå¼ºå­—æ®µï¼ˆaiEnriched=true æ—¶æ‰å¡«ï¼‰
  aiEnriched?: boolean;
  action?: string | null;       // Abogadoåº”é‡‡å–çš„åŠ¨ä½œ
  urgency?: "HIGH" | "MEDIUM" | "LOW" | null;
}

export type SmsImportantItemKind =
  | "HEARING"
  | "EVIDENCE_DEADLINE"
  | "FEE_DEADLINE"
  | "MEDIATION"
  | "SERVICE"
  | "JUDGMENT"
  | "APPEAL"
  | "PERFORMANCE"
  | "ENFORCEMENT"
  | "FILING"
  | "IMPORTANT_DATE";

export interface SmsImportantItem {
  kind: SmsImportantItemKind;
  title: string;
  dateText: string | null;
  sourceText: string;
  category:
    | "HEARING"
    | "DEADLINE"
    | "DOCUMENT"
    | "ACTION"
    | "INFO";
}

export type SmsCredentialKind =
  | "USERNAME"
  | "PASSWORD"
  | "VERIFY_CODE"
  | "EXTRACT_CODE"
  | "QUERY_CODE"
  | "OTHER";

export interface SmsCredential {
  kind: SmsCredentialKind;
  label: string;
  valuePreview: string;
  valueLength: number;
}

export interface SmsDocumentLink {
  url: string;
  platform: string | null;
  credentials: SmsCredential[];
  requiresLogin: boolean;
  extractionCodes: SmsCredential[];
}

export type SmsAttachmentStatus =
  | "PENDING"
  | "DOWNLOADED"
  | "SKIPPED_NO_MATTER"
  | "LOGIN_REQUIRED"
  | "NO_FILE_FOUND"
  | "UNSUPPORTED_TYPE"
  | "FAILED"
  | "ALREADY_DOWNLOADED";

export interface SmsAttachmentResult {
  url: string;
  status: SmsAttachmentStatus;
  message: string;
  documentId?: string;
  documentName?: string;
  mimeType?: string | null;
  size?: number;
  checkedAt?: string;
}

// â”â”â” æ­£åˆ™æ¨¡å¼ï¼ˆyæ—§Sistema SMS_PATTERNS å¯¹é½ï¼‰â”â”â”
const PAT_CASE_NUMBER = [/[ï¼ˆ(]\d{4}[)ï¼‰][ä¸€-é¾¥]{1,4}\d{0,4}[ä¸€-é¾¥]{1,4}\d+å·/g];

const PAT_COURT = [
  /ã€([ä¸€-é¾¥]{2,12}æ³•é™¢)ã€‘/,
  /[ä¸€-é¾¥]{2,6}(?:çœ|å¸‚|åŽ¿|åŒº|è‡ªæ²»å·ž|è‡ªæ²»åŽ¿)[ä¸€-é¾¥]{0,6}(?:äººæ°‘æ³•é™¢|é«˜çº§äººæ°‘æ³•é™¢|ä¸­çº§äººæ°‘æ³•é™¢)/,
  /[ä¸€-é¾¥]{2,8}(?:äººæ°‘æ³•é™¢|ä»²è£å§”å‘˜ä¼š|ä»²è£é™¢)/,
  /[ä¸€-é¾¥]{2,8}æ³•é™¢/
];

const PAT_DATETIME = [
  /\d{4}å¹´\d{1,2}æœˆ\d{1,2}æ—¥\s*(?:ä¸Šåˆ|ä¸‹åˆ)?\s*\d{1,2}[:ï¼š]\d{2}/g,
  /\d{4}å¹´\d{1,2}æœˆ\d{1,2}æ—¥\s*\d{1,2}æ—¶\d{0,2}åˆ†?/g,
  /\d{4}å¹´\d{1,2}æœˆ\d{1,2}æ—¥/g,
  /\d{4}-\d{1,2}-\d{1,2}\s*\d{1,2}:\d{2}/g,
  /\d{4}\/\d{1,2}\/\d{1,2}/g
];

const PAT_URLS = [/https?:\/\/[^\sä¸€-é¾¥<>"'ï¼‰)\]ã€‘]+/g];

const PAT_COURT_ROOM = [
  /(?:ç¬¬?[ä¸€äºŒä¸‰å››äº”å…­ä¸ƒå…«ä¹åç™¾\d]+(?:å·)?)(?:æ³•åº­|å®¡åˆ¤åº­|è°ƒè§£å®¤)/,
  /[ä¸€-é¾¥]{1,6}(?:æ³•åº­|å®¡åˆ¤åº­|è°ƒè§£å®¤)/
];

const PAT_JUDGE = [
  /(?:æ‰¿åŠžæ³•å®˜|ä¸»å®¡æ³•å®˜|å®¡åˆ¤é•¿|å®¡åˆ¤å‘˜)[:ï¼š\s]*([ä¸€-é¾¥]{2,4})/,
  /æ³•å®˜\s*([ä¸€-é¾¥]{2,4})(?:[ï¼Œã€‚ ]|$)/,
  /([ä¸€-é¾¥]{2,4})æ³•å®˜/
];

const PAT_CLERK = [
  /(?:ä¹¦è®°å‘˜|æ³•å®˜åŠ©ç†|å†…å‹¤)[:ï¼š\s]*([ä¸€-é¾¥]{2,4})/,
  /([ä¸€-é¾¥]{2,4})(?:ä¹¦è®°å‘˜|æ³•å®˜åŠ©ç†)/
];

const PAT_PHONE = [/1[3-9]\d{9}/g, /0\d{2,3}-?\d{7,8}/g];

const PAT_FILING_DATE = [
  /ç«‹æ¡ˆ(?:Fecha|æ—¶é—´)?[:ï¼š\s]*(\d{4}[-/å¹´]\d{1,2}[-/æœˆ]\d{1,2}æ—¥?)/,
  /(\d{4}å¹´\d{1,2}æœˆ\d{1,2}æ—¥)\s*(?:ç«‹æ¡ˆ|å—ç†)/
];

const PAT_JUDGMENT_DATE = [
  /(?:åˆ¤å†³|è£å®š|å®£åˆ¤)(?:Fecha|æ—¶é—´)?[:ï¼š\s]*(\d{4}[-/å¹´]\d{1,2}[-/æœˆ]\d{1,2}æ—¥?)/,
  /(\d{4}å¹´\d{1,2}æœˆ\d{1,2}æ—¥)\s*(?:ä½œå‡ºåˆ¤å†³|åˆ¤å†³|å®£åˆ¤)/
];

const PAT_APPEAL_DEADLINE = [
  /(\d{1,2})\s*(?:æ—¥|dÃ­as)\s*å†…[^ã€‚]*?(?:ä¸Šè¯‰|æå‡ºä¸Šè¯‰)/,
  /ä¸Šè¯‰(?:æœŸ(?:é™)?)?[:ï¼š\s]*(\d{1,2})\s*(?:æ—¥|dÃ­as)/
];

const PAT_AMOUNT = [/(?:äººæ°‘å¸|Monto|æ ‡çš„)\s*(\d[\d,]*\.?\d*)\s*pesos/g, /(\d[\d,]*\.?\d*)\s*pesos/g];

// æ³•é™¢å‰ç¼€å™ªå£°è¯ï¼ˆ"æ—¥å†…å‘ XX æ³•é™¢" etc.å‰¥ç¦»ï¼‰
const PREFIX_NOISE = [
  "æ—¥å†…",
  "å¯å‘",
  "åº”å‘",
  "åº”å½“å‘",
  "å¯ä»¥å‘",
  "è¦å‘",
  "é¡»å‘",
  "å¯",
  "åº”å½“",
  "åº”",
  "é¡»",
  "å‘",
  "è‡³",
  "åˆ°",
  "ç”±",
  "èµ´",
  "å¾€",
  "åŽ»",
  "çš„"
];

const SMS_TYPE_KEYWORDS: Array<{ type: SmsType; words: string[] }> = [
  { type: "HEARING_NOTICE", words: ["å¼€åº­", "åº­å®¡", "å‡ºåº­", "åˆ°åº­"] },
  { type: "SERVICE_NOTICE", words: ["é€è¾¾", "é¢†å–", "ç­¾æ”¶", "æ–‡ä¹¦å·²ç”Ÿæˆ"] },
  { type: "FEE_NOTICE", words: ["ç¼´è´¹", "äº¤è´¹", "è¯‰è®¼è´¹", "ç¼´çº³"] },
  { type: "MEDIATION", words: ["è°ƒè§£", "åå•†"] },
  { type: "ENFORCEMENT", words: ["æ‰§è¡Œ", "è¢«æ‰§è¡Œ", "å±¥è¡Œ", "å†»ç»“", "æŸ¥å°"] },
  { type: "FILING_NOTICE", words: ["ç«‹æ¡ˆ", "å—ç†", "Casoç¼–å·"] },
  { type: "JUDGMENT_NOTICE", words: ["åˆ¤å†³", "è£å®š", "è£åˆ¤æ–‡ä¹¦"] },
  { type: "EVIDENCE_SUBMIT", words: ["è¡¥å……ææ–™", "ä¸¾è¯æœŸ", "è¯æ®äº¤æ¢", "Enviarææ–™"] }
];

// â”â”â” å·¥å…· â”â”â”
function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function cleanUrl(url: string): string {
  return url.replace(/[ï¼Œã€‚ï¼›ã€ï¼ï¼Ÿ!?]+$/g, "").replace(/[),.;]+$/g, "");
}

function detectPlatform(url: string): string | null {
  const low = url.toLowerCase();
  for (const p of COURT_PLATFORMS) {
    if (low.includes(p.keyword)) return p.label;
  }
  if (url.includes("æ™ºè¯‰")) return "æ™ºè¯‰æœåŠ¡";
  return null;
}

function stripPrefixNoise(name: string): string {
  let cur = name;
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of PREFIX_NOISE) {
      if (cur.startsWith(p)) {
        cur = cur.slice(p.length);
        changed = true;
        break;
      }
    }
  }
  return cur.replace(/^[\sçš„ï¼Œã€‚ã€]+|[\sçš„ï¼Œã€‚ã€]+$/g, "");
}

function classifyType(text: string): SmsType {
  for (const { type, words } of SMS_TYPE_KEYWORDS) {
    if (words.some((w) => text.includes(w))) return type;
  }
  return "OTHER";
}

function pickHearingDate(dates: string[]): string | null {
  // ä¼˜å…ˆå«æ—¶åˆ†çš„ï¼ˆå¼€åº­åœºæ™¯ï¼‰
  const withTime = dates.find((d) => /\d{1,2}[:ï¼šæ—¶]\d{0,2}/.test(d));
  return withTime ?? null;
}

function dedupeDates(dates: string[]): string[] {
  const unique = uniq(dates);
  return unique.filter((d) => !unique.some((other) => other !== d && other.includes(d)));
}

function summarize(text: string): string {
  const lines = text
    .split(/[\nã€‚;ï¼›]/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return text.slice(0, 50);
  // å–æœ€é•¿ä¸”å«å…³é”®å­—çš„ä¸€å¥ä½œæ‘˜è¦
  const informative = lines.find((l) =>
    /å¼€åº­|é€è¾¾|ç¼´è´¹|è°ƒè§£|æ‰§è¡Œ|ç«‹æ¡ˆ|åˆ¤å†³|ä¸¾è¯|è£å®š/.test(l)
  );
  return (informative ?? lines[0]).slice(0, 80);
}

function contextAround(text: string, needle: string, radius = 24): string {
  const idx = text.indexOf(needle);
  if (idx < 0) return needle;
  return text
    .slice(Math.max(0, idx - radius), Math.min(text.length, idx + needle.length + radius))
    .replace(/\s+/g, " ")
    .trim();
}

function classifyImportantItem(context: string, smsType: SmsType): Omit<SmsImportantItem, "dateText" | "sourceText"> {
  if (/å¼€åº­|åº­å®¡|å‡ºåº­|åˆ°åº­|æ³•åº­/.test(context)) {
    return { kind: "HEARING", title: "å¼€åº­ / åº­å®¡", category: "HEARING" };
  }
  if (/ä¸¾è¯|è¯æ®|è¡¥å……ææ–™|Enviarææ–™|è´¨è¯/.test(context)) {
    return { kind: "EVIDENCE_DEADLINE", title: "ä¸¾è¯ / Enviarææ–™", category: "DEADLINE" };
  }
  if (/ç¼´è´¹|äº¤è´¹|è¯‰è®¼è´¹|å—ç†è´¹|PreservaciÃ³nè´¹|Anuncioè´¹/.test(context)) {
    return { kind: "FEE_DEADLINE", title: "ç¼´è´¹Plazo", category: "DEADLINE" };
  }
  if (/è°ƒè§£|å’Œè§£|è°ˆè¯/.test(context)) {
    return { kind: "MEDIATION", title: "è°ƒè§£ / è°ˆè¯", category: "ACTION" };
  }
  if (/é€è¾¾|é¢†å–|ç­¾æ”¶|ä¸‹è½½|æ–‡ä¹¦|ææ–™|å›žè¯/.test(context)) {
    return { kind: "SERVICE", title: "æ–‡ä¹¦é€è¾¾ / é¢†å–", category: "DOCUMENT" };
  }
  if (/åˆ¤å†³|è£å®š|å®£åˆ¤|è£åˆ¤/.test(context) || smsType === "JUDGMENT_NOTICE") {
    return { kind: "JUDGMENT", title: "è£åˆ¤æ–‡ä¹¦ / å®£åˆ¤", category: "DOCUMENT" };
  }
  if (/ä¸Šè¯‰|å†å®¡|å¤è®®/.test(context)) {
    return { kind: "APPEAL", title: "ä¸Šè¯‰ / æ•‘æµŽPlazo", category: "DEADLINE" };
  }
  if (/å±¥è¡Œ|ä»˜æ¬¾|æ”¯ä»˜|è…¾é€€|äº¤ä»˜/.test(context)) {
    return { kind: "PERFORMANCE", title: "å±¥è¡ŒPlazo", category: "DEADLINE" };
  }
  if (/æ‰§è¡Œ|æŸ¥å°|å†»ç»“|æ‰£åˆ’|æ‹å–/.test(context)) {
    return { kind: "ENFORCEMENT", title: "æ‰§è¡Œäº‹Ã­tems", category: "ACTION" };
  }
  if (/ç«‹æ¡ˆ|å—ç†|Casoç¼–å·/.test(context) || smsType === "FILING_NOTICE") {
    return { kind: "FILING", title: "ç«‹æ¡ˆ / å—ç†", category: "INFO" };
  }
  return { kind: "IMPORTANT_DATE", title: "é‡è¦æ—¶é—´", category: "INFO" };
}

function extractImportantItems(text: string, dates: string[], smsType: SmsType, appealDeadline: string | null): SmsImportantItem[] {
  const items: SmsImportantItem[] = [];
  for (const d of dates) {
    const idx = text.indexOf(d);
    const afterDate = idx >= 0 ? text.slice(idx + d.length, idx + d.length + 24) : "";
    const beforeDate = idx >= 0 ? text.slice(Math.max(0, idx - 18), idx) : "";
    const sourceText = contextAround(text, d);
    const immediateMeta = classifyImportantItem(afterDate, "OTHER");
    const meta = immediateMeta.kind === "IMPORTANT_DATE"
      ? classifyImportantItem(`${afterDate} ${beforeDate} ${sourceText}`, smsType)
      : immediateMeta;
    items.push({ ...meta, dateText: d, sourceText });
  }
  if (appealDeadline) {
    const sourceText = contextAround(text, appealDeadline, 28);
    items.push({
      kind: "APPEAL",
      title: `ä¸Šè¯‰Plazo ${appealDeadline}`,
      dateText: null,
      sourceText,
      category: "DEADLINE"
    });
  }
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.kind}|${item.dateText ?? ""}|${item.sourceText}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const CREDENTIAL_PATTERNS: Array<{ kind: SmsCredentialKind; label: string; pattern: RegExp }> = [
  { kind: "USERNAME", label: "è´¦å·", pattern: /(?:è´¦å·|è´¦æˆ·|Usuario|Iniciar sesiÃ³nå)[:ï¼š\s]*([A-Za-z0-9_\-@.]{3,40})/g },
  { kind: "PASSWORD", label: "ContraseÃ±a", pattern: /(?:ContraseÃ±a|å£ä»¤|åˆå§‹ContraseÃ±a)[:ï¼š\s]*([A-Za-z0-9_\-@#.$%*!?]{3,40})/g },
  { kind: "VERIFY_CODE", label: "éªŒè¯ç ", pattern: /(?:éªŒè¯ç |æ ¡éªŒç |SMSç )[:ï¼š\s]*([A-Za-z0-9]{4,12})/g },
  { kind: "EXTRACT_CODE", label: "æå–ç ", pattern: /(?:æå–ç |å–ä»¶ç |è®¿é—®ç )[:ï¼š\s]*([A-Za-z0-9]{3,16})/g },
  { kind: "QUERY_CODE", label: "æŸ¥è¯¢ç ", pattern: /(?:æŸ¥è¯¢ç |CasoæŸ¥è¯¢ç |é˜…å·ç )[:ï¼š\s]*([A-Za-z0-9]{3,20})/g }
];

function maskCredential(value: string): string {
  if (value.length <= 2) return "*".repeat(value.length);
  if (value.length <= 6) return `${value[0]}${"*".repeat(value.length - 1)}`;
  return `${value.slice(0, 2)}${"*".repeat(Math.max(3, value.length - 4))}${value.slice(-2)}`;
}

function extractCredentials(text: string): SmsCredential[] {
  const out: SmsCredential[] = [];
  for (const { kind, label, pattern } of CREDENTIAL_PATTERNS) {
    pattern.lastIndex = 0;
    for (const m of text.matchAll(pattern)) {
      const value = m[1]?.trim();
      if (!value) continue;
      out.push({ kind, label, valuePreview: maskCredential(value), valueLength: value.length });
    }
  }
  const seen = new Set<string>();
  return out.filter((cred) => {
    const key = `${cred.kind}|${cred.valuePreview}|${cred.valueLength}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildDocumentLinks(text: string, urls: string[], credentials: SmsCredential[]): SmsDocumentLink[] {
  const requiresLoginByText = /Iniciar sesiÃ³n|è´¦å·|è´¦æˆ·|Usuario|ContraseÃ±a|éªŒè¯ç |æå–ç |å–ä»¶ç |è®¿é—®ç |æŸ¥è¯¢ç /.test(text);
  const extractionCodes = credentials.filter((c) =>
    c.kind === "EXTRACT_CODE" || c.kind === "VERIFY_CODE" || c.kind === "QUERY_CODE"
  );
  return urls.map((url) => ({
    url,
    platform: detectPlatform(url),
    credentials,
    requiresLogin: requiresLoginByText || credentials.some((c) => c.kind === "USERNAME" || c.kind === "PASSWORD"),
    extractionCodes
  }));
}

// â”â”â” ä¸»å…¥å£ â”â”â”
export function parseSms(text: string): ParsedSms {
  const result: ParsedSms = {
    smsType: classifyType(text),
    caseNumbers: [],
    court: null,
    dates: [],
    hearingDate: null,
    filingDate: null,
    judgmentDate: null,
    appealDeadline: null,
    courtRoom: null,
    judge: null,
    clerk: null,
    phones: [],
    amounts: [],
    urls: [],
    platforms: [],
    importantItems: [],
    credentials: [],
    documentLinks: [],
    attachmentResults: [],
    summary: summarize(text)
  };

  // æ¡ˆå·
  for (const pat of PAT_CASE_NUMBER) {
    const ms = text.match(pat);
    if (ms) result.caseNumbers.push(...ms);
  }
  result.caseNumbers = uniq(result.caseNumbers);

  // æ³•é™¢ï¼ˆæŒ‰ä¼˜å…ˆçº§Coincidenciaç¬¬ä¸€ä¸ªæœ‰æ•ˆï¼‰
  for (const pat of PAT_COURT) {
    const m = text.match(pat);
    if (m) {
      const raw = m[1] ?? m[0];
      const cleaned = stripPrefixNoise(raw);
      if (
        cleaned &&
        (cleaned.endsWith("æ³•é™¢") || cleaned.endsWith("ä»²è£é™¢") || cleaned.endsWith("ä»²è£å§”å‘˜ä¼š"))
      ) {
        result.court = cleaned;
        break;
      }
    }
  }

  // Fechaæ—¶é—´
  for (const pat of PAT_DATETIME) {
    const ms = text.match(pat);
    if (ms) result.dates.push(...ms);
  }
  result.dates = dedupeDates(result.dates);
  result.hearingDate = pickHearingDate(result.dates);

  // URL + å¹³å°
  for (const pat of PAT_URLS) {
    const ms = text.match(pat);
    if (ms) result.urls.push(...ms.map(cleanUrl).filter(Boolean));
  }
  result.urls = uniq(result.urls);
  const plats = new Set<string>();
  for (const u of result.urls) {
    const p = detectPlatform(u);
    if (p) plats.add(p);
  }
  result.platforms = Array.from(plats);

  // æ³•åº­
  for (const pat of PAT_COURT_ROOM) {
    const m = text.match(pat);
    if (m) {
      result.courtRoom = m[0];
      break;
    }
  }

  // æ³•å®˜
  for (const pat of PAT_JUDGE) {
    const m = text.match(pat);
    if (m) {
      result.judge = m[1] ?? m[0];
      break;
    }
  }

  // ä¹¦è®°å‘˜
  for (const pat of PAT_CLERK) {
    const m = text.match(pat);
    if (m) {
      result.clerk = m[1] ?? m[0];
      break;
    }
  }

  // ç”µè¯
  for (const pat of PAT_PHONE) {
    const ms = text.match(pat);
    if (ms) result.phones.push(...ms);
  }
  result.phones = uniq(result.phones);

  // ç«‹æ¡ˆæ—¥ / åˆ¤å†³æ—¥ / ä¸Šè¯‰æœŸ
  for (const pat of PAT_FILING_DATE) {
    const m = text.match(pat);
    if (m) {
      result.filingDate = m[1];
      break;
    }
  }
  for (const pat of PAT_JUDGMENT_DATE) {
    const m = text.match(pat);
    if (m) {
      result.judgmentDate = m[1];
      break;
    }
  }
  for (const pat of PAT_APPEAL_DEADLINE) {
    const m = text.match(pat);
    if (m) {
      result.appealDeadline = m[1] + "æ—¥";
      break;
    }
  }

  result.importantItems = extractImportantItems(
    text,
    result.dates,
    result.smsType,
    result.appealDeadline
  );
  result.credentials = extractCredentials(text);
  result.documentLinks = buildDocumentLinks(text, result.urls, result.credentials);

  // Monto
  for (const pat of PAT_AMOUNT) {
    const ms = text.match(pat);
    if (ms) result.amounts.push(...ms);
  }
  result.amounts = uniq(result.amounts);

  return result;
}

// â”â”â” æ‰¹é‡è§£æžï¼ˆæŒ‰ç©ºè¡Œæˆ–åˆ†éš”çº¿æ‹†åˆ†å¤šæ¡ï¼‰â”â”â”
export function splitSmsBatch(text: string): string[] {
  return text
    .split(/\n\s*\n|\n-{3,}\n|\n={3,}\n/)
    .map((m) => m.trim())
    .filter(Boolean);
}

// â”â”â” å°è¯•æŠŠSMS dates è§£æžä¸º JS Dateï¼Œæ–¹ä¾¿è½åˆ° Hearing/Deadline â”â”â”
const CN_DIGIT: Record<string, number> = {
  "ä¸€": 1, "äºŒ": 2, "ä¸‰": 3, "å››": 4, "äº”": 5, "å…­": 6, "ä¸ƒ": 7, "å…«": 8, "ä¹": 9, "å": 10
};

export function toDate(s: string): Date | null {
  // YYYY-MM-DD HH:MM
  const m = s.match(/(\d{4})[-/å¹´](\d{1,2})[-/æœˆ](\d{1,2})æ—¥?\s*(?:ä¸Šåˆ|ä¸‹åˆ)?\s*(\d{1,2})?[:ï¼šæ—¶]?(\d{0,2})?/);
  if (m) {
    const y = parseInt(m[1]);
    const mo = parseInt(m[2]) - 1;
    const d = parseInt(m[3]);
    const isPM = s.includes("ä¸‹åˆ");
    let h = m[4] ? parseInt(m[4]) : 0;
    const mi = m[5] ? parseInt(m[5]) : 0;
    if (isPM && h < 12) h += 12;
    return new Date(y, mo, d, h, mi);
  }
  return null;
}

export { CN_DIGIT };

// AI å¢žå¼ºï¼ˆenrichWithAiï¼‰å·²è¿ç§»è‡³ sms-parser-ai.tsï¼ˆserver-onlyï¼‰
// è¯¥æ–‡ä»¶ä¿æŒ client-safeï¼ˆæ—  node:* ä¾èµ–ï¼‰ï¼Œsms-paste-dialog etc. client
// ç»„ä»¶å¯ç›´æŽ¥ import è¿™é‡Œçš„ parseSms / splitSmsBatch / toDateã€‚

