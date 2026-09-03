/**
 * AI æ–‡ä¹¦å®¡æŸ¥Volverå†…å®¹çš„è§£æžé€»è¾‘ï¼ˆçº¯å‡½æ•°ï¼Œä¾¿äºŽå•æµ‹ï¼‰
 * å®žé™…è°ƒç”¨èµ° src/server/ai/review-document.ts
 */
import { extractJson } from "./client";

export type ReviewType = "MISSING" | "RISK" | "ISSUE" | "SUGGESTION";
export type ReviewSeverity = "HIGH" | "MEDIUM" | "LOW";

export type ReviewItem = {
  type: ReviewType;
  severity: ReviewSeverity;
  title: string;
  detail: string;
};

const VALID_TYPES: ReadonlySet<ReviewType> = new Set([
  "MISSING",
  "RISK",
  "ISSUE",
  "SUGGESTION",
]);
const VALID_SEV: ReadonlySet<ReviewSeverity> = new Set([
  "HIGH",
  "MEDIUM",
  "LOW",
]);
const SEV_ORDER: Record<ReviewSeverity, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

/**
 * æŠŠ AI Volveræ–‡æœ¬è§£æžä¸ºè§„èŒƒåŒ– ReviewItem æ•°ç»„ã€‚
 * - JSON è§£æžErroræŠ›é”™ï¼ˆè°ƒç”¨æ–¹å†³å®šæ€Žä¹ˆå¤„ç†ï¼‰
 * - éžæ³• type/severity å›žé€€ä¸º ISSUE/MEDIUM
 * - title/detail ä»»ä¸€ä¸ºç©ºçš„æ¡ç›®ä¸¢å¼ƒ
 * - æŒ‰ severity HIGHâ†’LOW æŽ’åº
 */
export function parseReviewItems(content: string): ReviewItem[] {
  const parsed = extractJson<unknown>(content);
  if (!Array.isArray(parsed)) {
    throw new Error(
      "No se pudo analizar el contenido de AI Volver como una lista de revisiÃ³n",
    );
  }
  const items: ReviewItem[] = [];
  for (const raw of parsed as Array<Record<string, unknown>>) {
    const type =
      typeof raw.type === "string"
        ? (raw.type.toUpperCase() as ReviewType)
        : "ISSUE";
    const severity =
      typeof raw.severity === "string"
        ? (raw.severity.toUpperCase() as ReviewSeverity)
        : "MEDIUM";
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    const detail = typeof raw.detail === "string" ? raw.detail.trim() : "";
    if (!title || !detail) continue;
    items.push({
      type: VALID_TYPES.has(type) ? type : "ISSUE",
      severity: VALID_SEV.has(severity) ? severity : "MEDIUM",
      title,
      detail,
    });
  }
  items.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  return items;
}

