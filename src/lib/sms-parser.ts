/**
 * Parser de SMS judiciales argentinos (TypeScript)
 *
 * Uso:
 *   const parsed = parseSms(rawText);
 *   parsed.smsType / parsed.caseNumbers / parsed.hearingDate ...
 *
 * Este archivo es puramente regex + helpers, sin dependencias server-only.
 */
import type { SmsType } from "@prisma/client";

export interface SmsPlatformHint {
  keyword: string;
  label: string;
}

const COURT_PLATFORMS: SmsPlatformHint[] = [
  { keyword: "pjn", label: "Poder Judicial de la Nación" },
  { keyword: "scba", label: "Suprema Corte de Buenos Aires" },
  { keyword: "mev", label: "MEV - Trámites a Distancia" },
  { keyword: "snep", label: "Sistema de Notificaciones Electrónicas" },
  { keyword: "notificaciones", label: "Sistema de Notificaciones" },
  { keyword: "pjudicial", label: "Portal Judicial" }
];

export interface ParsedSms {
  smsType: SmsType;
  caseNumbers: string[];
  court: string | null;
  dates: string[];
  hearingDate: string | null;
  filingDate: string | null;
  judgmentDate: string | null;
  appealDeadline: string | null;
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
  aiEnriched?: boolean;
  action?: string | null;
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
  category: "HEARING" | "DEADLINE" | "DOCUMENT" | "ACTION" | "INFO";
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

// Patrones para Argentina
const PAT_CASE_NUMBER = [
  /(?:Expte|Expediente|Causa|Caso)[:\s]*(?:N[°º]?\s*)?([A-Z0-9]{2,}-?[A-Z0-9]{2,}-?[A-Z0-9]{2,})/gi,
  /([A-Z]{2,5}-\d{3,}-\d{4})/g
];

const PAT_COURT = [
  /(?:Juzgado|Tribunal|Cámara|Corte|Sala)[:\s]*([A-Za-zÁáÉéÍíÓóÚúÜüÑñ\s]{3,60})/i,
  /([A-Za-zÁáÉéÍíÓóÚúÜüÑñ]{2,20}(?:Juzgado|Tribunal|Cámara|Corte))/i
];

const PAT_DATETIME = [
  /\d{1,2}\/\d{1,2}\/\d{4}\s*\d{1,2}:\d{2}/g,
  /\d{1,2}\/\d{1,2}\/\d{4}/g,
  /\d{1,2}[-]\d{1,2}[-]\d{4}\s*\d{1,2}:\d{2}/g,
  /\d{1,2}[-]\d{1,2}[-]\d{4}/g
];

const PAT_URLS = [/https?:\/\/[^\s<>"']+/g];

const PAT_COURT_ROOM = [
  /(?:Sala|Aula|Oficina)[:\s]*([A-Za-z0-9\s]{2,20})/i,
  /([A-Za-z0-9\s]{2,10}(?:Sala))/i
];

const PAT_JUDGE = [
  /(?:Juez|Jueza|Dr\.?|Dra\.?)[:\s]*([A-Za-zÁáÉéÍíÓóÚúÜüÑñ\s]{3,40})/i,
  /([A-Za-zÁáÉéÍíÓóÚúÜüÑñ]{2,30}(?:Juez|Jueza))/i
];

const PAT_CLERK = [
  /(?:Secretario|Secretaria|Prosecretario)[:\s]*([A-Za-zÁáÉéÍíÓóÚúÜüÑñ\s]{3,40})/i
];

const PAT_PHONE = [
  /\+?54\s*\d{2,4}[-.\s]?\d{4}[-.\s]?\d{4}/g,
  /\d{2,4}[-.\s]?\d{4}[-.\s]?\d{4}/g
];

const PAT_FILING_DATE = [
  /(?:Fecha de inicio|Iniciado)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
  /(?:Radicado|Radicación)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i
];

const PAT_JUDGMENT_DATE = [
  /(?:Sentencia|Fallo|Resolución)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i
];

const PAT_APPEAL_DEADLINE = [
  /(\d{1,2})\s*(?:días|dias)\s*(?:para|de)\s*(?:apelar|recurrir)/i,
  /(?:apelar|recurrir)[:\s]*(\d{1,2})\s*(?:días|dias)/i
];

const PAT_AMOUNT = [
  /(?:Monto|Suma|Importe)[:\s]*\$?\s*(\d[\d.,]*)/gi,
  /\$\s*(\d[\d.,]*)/g
];

const PREFIX_NOISE = ["dentro de", "ante", "para", "en", "por", "a", "el", "la"];

const SMS_TYPE_KEYWORDS: Array<{ type: SmsType; words: string[] }> = [
  { type: "HEARING_NOTICE", words: ["audiencia", "vista", "comparendo"] },
  { type: "SERVICE_NOTICE", words: ["notificación", "cédula", "traslado"] },
  { type: "FEE_NOTICE", words: ["tasa", "pago", "arancel", "sellado"] },
  { type: "MEDIATION", words: ["mediación", "conciliación", "acuerdo"] },
  { type: "ENFORCEMENT", words: ["ejecución", "embargo", "cumplimiento"] },
  { type: "FILING_NOTICE", words: ["radicación", "inicio", "expediente"] },
  { type: "JUDGMENT_NOTICE", words: ["sentencia", "fallo", "resolución"] },
  { type: "EVIDENCE_SUBMIT", words: ["prueba", "evidencia", "documentación"] }
];

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function cleanUrl(url: string): string {
  return url.replace(/[,.;!?]+$/g, "");
}

function detectPlatform(url: string): string | null {
  const low = url.toLowerCase();
  for (const p of COURT_PLATFORMS) {
    if (low.includes(p.keyword)) return p.label;
  }
  return null;
}

function stripPrefixNoise(name: string): string {
  let cur = name;
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of PREFIX_NOISE) {
      if (cur.toLowerCase().startsWith(p)) {
        cur = cur.slice(p.length);
        changed = true;
        break;
      }
    }
  }
  return cur.replace(/^[\s,.;:]+|[\s,.;:]+$/g, "");
}

function classifyType(text: string): SmsType {
  for (const { type, words } of SMS_TYPE_KEYWORDS) {
    if (words.some((w) => text.toLowerCase().includes(w))) return type;
  }
  return "OTHER";
}

function pickHearingDate(dates: string[]): string | null {
  const withTime = dates.find((d) => /\d{1,2}:\d{2}/.test(d));
  return withTime ?? null;
}

function dedupeDates(dates: string[]): string[] {
  const unique = uniq(dates);
  return unique.filter((d) => !unique.some((other) => other !== d && other.includes(d)));
}

function summarize(text: string): string {
  const lines = text.split(/[\n.;]/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return text.slice(0, 50);
  return lines[0].slice(0, 80);
}

function contextAround(text: string, needle: string, radius = 24): string {
  const idx = text.indexOf(needle);
  if (idx < 0) return needle;
  return text.slice(Math.max(0, idx - radius), Math.min(text.length, idx + needle.length + radius)).replace(/\s+/g, " ").trim();
}

function classifyImportantItem(context: string, smsType: SmsType): Omit<SmsImportantItem, "dateText" | "sourceText"> {
  if (/audiencia|vista|comparendo/i.test(context)) {
    return { kind: "HEARING", title: "Audiencia / Vista", category: "HEARING" };
  }
  if (/prueba|evidencia|documentación/i.test(context)) {
    return { kind: "EVIDENCE_DEADLINE", title: "Presentar documentación", category: "DEADLINE" };
  }
  if (/tasa|pago|arancel/i.test(context)) {
    return { kind: "FEE_DEADLINE", title: "Plazo de pago", category: "DEADLINE" };
  }
  if (/mediación|conciliación/i.test(context)) {
    return { kind: "MEDIATION", title: "Mediación / Conciliación", category: "ACTION" };
  }
  if (/notificación|cédula|traslado/i.test(context)) {
    return { kind: "SERVICE", title: "Notificación / Traslado", category: "DOCUMENT" };
  }
  if (/sentencia|fallo|resolución/i.test(context) || smsType === "JUDGMENT_NOTICE") {
    return { kind: "JUDGMENT", title: "Sentencia / Fallo", category: "DOCUMENT" };
  }
  if (/apelar|recurrir/i.test(context)) {
    return { kind: "APPEAL", title: "Plazo para apelar", category: "DEADLINE" };
  }
  if (/ejecución|embargo/i.test(context)) {
    return { kind: "ENFORCEMENT", title: "Ejecución / Embargo", category: "ACTION" };
  }
  if (/radicación|inicio|expediente/i.test(context) || smsType === "FILING_NOTICE") {
    return { kind: "FILING", title: "Radicación / Inicio", category: "INFO" };
  }
  return { kind: "IMPORTANT_DATE", title: "Fecha importante", category: "INFO" };
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
      title: `Plazo para apelar: ${appealDeadline}`,
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
  { kind: "USERNAME", label: "Usuario", pattern: /(?:Usuario|Cuenta|Acceso)[:\s]*([A-Za-z0-9_\-@.]{3,40})/g },
  { kind: "PASSWORD", label: "Contraseña", pattern: /(?:Contraseña|Clave)[:\s]*([A-Za-z0-9_\-@#.$%*!?]{3,40})/g },
  { kind: "VERIFY_CODE", label: "Código de verificación", pattern: /(?:Código|Token|PIN)[:\s]*([A-Za-z0-9]{4,12})/g },
  { kind: "EXTRACT_CODE", label: "Código de extracción", pattern: /(?:Extracción|Retiro)[:\s]*([A-Za-z0-9]{3,16})/g },
  { kind: "QUERY_CODE", label: "Código de consulta", pattern: /(?:Consulta|Expediente)[:\s]*([A-Za-z0-9]{3,20})/g }
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
  const requiresLoginByText = /Usuario|Contraseña|Acceso|Clave|Código/i.test(text);
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

  // Números de caso
  for (const pat of PAT_CASE_NUMBER) {
    const ms = text.match(pat);
    if (ms) result.caseNumbers.push(...ms.map((m) => (typeof m === "string" ? m : m[0])).filter(Boolean));
  }
  result.caseNumbers = uniq(result.caseNumbers);

  // Tribunal
  for (const pat of PAT_COURT) {
    const m = text.match(pat);
    if (m) {
      const raw = m[1] ?? m[0];
      const cleaned = stripPrefixNoise(raw);
      if (cleaned) {
        result.court = cleaned;
        break;
      }
    }
  }

  // Fechas
  for (const pat of PAT_DATETIME) {
    const ms = text.match(pat);
    if (ms) result.dates.push(...ms);
  }
  result.dates = dedupeDates(result.dates);
  result.hearingDate = pickHearingDate(result.dates);

  // URLs
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

  // Sala
  for (const pat of PAT_COURT_ROOM) {
    const m = text.match(pat);
    if (m) {
      result.courtRoom = m[0];
      break;
    }
  }

  // Juez
  for (const pat of PAT_JUDGE) {
    const m = text.match(pat);
    if (m) {
      result.judge = m[1] ?? m[0];
      break;
    }
  }

  // Secretario
  for (const pat of PAT_CLERK) {
    const m = text.match(pat);
    if (m) {
      result.clerk = m[1] ?? m[0];
      break;
    }
  }

  // Teléfonos
  for (const pat of PAT_PHONE) {
    const ms = text.match(pat);
    if (ms) result.phones.push(...ms);
  }
  result.phones = uniq(result.phones);

  // Fecha de radicación
  for (const pat of PAT_FILING_DATE) {
    const m = text.match(pat);
    if (m) {
      result.filingDate = m[1];
      break;
    }
  }

  // Fecha de sentencia
  for (const pat of PAT_JUDGMENT_DATE) {
    const m = text.match(pat);
    if (m) {
      result.judgmentDate = m[1];
      break;
    }
  }

  // Plazo de apelación
  for (const pat of PAT_APPEAL_DEADLINE) {
    const m = text.match(pat);
    if (m) {
      result.appealDeadline = m[1] + " días";
      break;
    }
  }

  result.importantItems = extractImportantItems(text, result.dates, result.smsType, result.appealDeadline);
  result.credentials = extractCredentials(text);
  result.documentLinks = buildDocumentLinks(text, result.urls, result.credentials);

  // Montos
  for (const pat of PAT_AMOUNT) {
    const ms = text.match(pat);
    if (ms) result.amounts.push(...ms.map((m) => (typeof m === "string" ? m : m[0])).filter(Boolean));
  }
  result.amounts = uniq(result.amounts);

  return result;
}

export function splitSmsBatch(text: string): string[] {
  return text.split(/\n\s*\n|\n-{3,}\n|\n={3,}\n/).map((m) => m.trim()).filter(Boolean);
}

const ES_DIGIT: Record<string, number> = {
  "uno": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5,
  "seis": 6, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10
};

export function toDate(s: string): Date | null {
  const m = s.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\s*(\d{1,2})?:?(\d{0,2})?/);
  if (m) {
    const d = parseInt(m[1]);
    const mo = parseInt(m[2]) - 1;
    const y = parseInt(m[3]);
    const h = m[4] ? parseInt(m[4]) : 0;
    const mi = m[5] ? parseInt(m[5]) : 0;
    return new Date(y, mo, d, h, mi);
  }
  return null;
}

export { ES_DIGIT };