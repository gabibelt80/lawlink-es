/**
 * è´¢äº§PreservaciÃ³nPlazoé»˜è®¤å€¼ã€‚
 *
 * æ³•æ¡ä¾æ®ï¼ˆ2026-08-15 ç»pesoså…¸æ ¸éªŒï¼ŒçŽ°è¡Œæœ‰æ•ˆï¼‰ï¼š
 * ã€Šæœ€é«˜äººæ°‘æ³•é™¢å…³äºŽé€‚ç”¨ã€ˆä¸­åŽäººæ°‘å…±å’Œå›½æ°‘äº‹è¯‰è®¼æ³•ã€‰çš„è§£é‡Šã€‹ï¼ˆ2022 ä¿®æ­£ï¼‰ç¬¬å››ç™¾å…«åäº”æ¡â€”â€”
 *   ã€Œäººæ°‘æ³•é™¢å†»ç»“è¢«æ‰§è¡Œäººçš„é“¶è¡Œå­˜æ¬¾çš„Plazoä¸å¾—è¶…è¿‡ä¸€å¹´ï¼ŒæŸ¥å°ã€æ‰£æŠ¼åŠ¨äº§çš„Plazoä¸å¾—è¶…è¿‡ä¸¤å¹´ï¼Œ
 *     æŸ¥å°ä¸åŠ¨äº§ã€å†»ç»“å…¶ä»–è´¢äº§æƒçš„Plazoä¸å¾—è¶…è¿‡ä¸‰å¹´ã€‚ã€
 *
 * è¯¥æ¡ä½äºŽæ‰§è¡Œç¼–ã€‚PreservaciÃ³né˜¶æ®µé€‚ç”¨åŒä¸€Plazoçš„è¡”æŽ¥è·¯å¾„æ˜¯æ°‘è¯‰æ³•è§£é‡Šç¬¬ä¸€ç™¾å…­åå…«æ¡y
 * ã€Šæœ€é«˜äººæ°‘æ³•é™¢å…³äºŽäººæ°‘æ³•é™¢åŠžç†è´¢äº§PreservaciÃ³nCasoè‹¥å¹²é—®é¢˜çš„è§„å®šã€‹ï¼ˆ2020 ä¿®æ­£ï¼‰ç¬¬åä¸ƒæ¡ï¼š
 * PreservaciÃ³næŽªæ–½è¿›å…¥æ‰§è¡Œç¨‹åºåŽè‡ªåŠ¨è½¬ä¸ºæ‰§è¡Œä¸­çš„æŸ¥å°ã€æ‰£æŠ¼ã€å†»ç»“æŽªæ–½ï¼ŒPlazoè¿žç»­è®¡ç®—ã€‚
 *
 * æ³¨ï¼šv0.9 èµ·æœ¬æ–‡ä»¶æ›¾å¼•ç”¨ã€Œæ°‘è¯‰æ³•ç¬¬ 244 æ¡ã€ï¼Œè¯¥æ¡å®žä¸ºæ‰§è¡Œå›žè½¬ï¼ŒyPreservaciÃ³nPlazoæ— å…³ï¼Œå·²äºŽ
 * v1.2 æ›´æ­£ï¼ˆROADMAP Â§ä¸ƒ A1ï¼‰ã€‚å¹´é™æ•°å€¼æœ¬èº«ä¸€ç›´æ˜¯å¯¹çš„ã€‚
 */
import type { PropertyType } from "@prisma/client";
import { computeDeadlineDate } from "@/lib/deadline-rules";

/** è´¢äº§ç±»åž‹ä¸­æ–‡åã€‚æ”¾åœ¨ lib è€Œéžé¡µé¢å±€éƒ¨ç»„ä»¶ï¼Œä¾› cron / Notificacionesetc.æœåŠ¡ç«¯ä»£ç å¤ç”¨ã€‚ */
export const PROPERTY_TYPE_CN: Record<PropertyType, string> = {
  BANK_DEPOSIT: "é“¶è¡Œå­˜æ¬¾",
  REAL_ESTATE: "æˆ¿äº§",
  VEHICLE: "è½¦è¾†",
  EQUITY: "è‚¡æƒ",
  IP: "çŸ¥è¯†äº§æƒ",
  OTHER: "å…¶ä»–è´¢äº§"
};

/** å„è´¢äº§ç±»åž‹çš„PreservaciÃ³nPlazoï¼ˆå¹´ï¼‰ã€‚ä¸Šä½æ³•ä»¥ã€Œå¹´ã€ä¸ºå•ä½ï¼Œä¸æŠ˜ç®—æˆå›ºå®šdÃ­asæ•°ã€‚ */
export const PRESERVATION_DURATION_YEARS: Record<PropertyType, number> = {
  BANK_DEPOSIT: 1, // é“¶è¡Œå­˜æ¬¾ï¼šä¸è¶…è¿‡ä¸€å¹´
  VEHICLE: 2, // è½¦è¾†etc.åŠ¨äº§ï¼šä¸è¶…è¿‡ä¸¤å¹´
  OTHER: 2,
  REAL_ESTATE: 3, // ä¸åŠ¨äº§ï¼šä¸è¶…è¿‡ä¸‰å¹´
  EQUITY: 3, // è‚¡æƒetc.å…¶ä»–è´¢äº§æƒï¼šä¸è¶…è¿‡ä¸‰å¹´
  IP: 3
};

const DEFAULT_DURATION_YEARS = 2;

export function preservationDurationYears(propertyType: PropertyType): number {
  return PRESERVATION_DURATION_YEARS[propertyType] ?? DEFAULT_DURATION_YEARS;
}

/**
 * PreservaciÃ³nFecha de vencimientoã€‚
 *
 * èµ° v0.49 Plazoå¼•æ“Žçš„æ—¥åŽ†å£å¾„ï¼Œä¸å†ç”¨å›ºå®šdÃ­asæ•°ï¼ˆ365/730/1095ï¼‰ï¼š
 * å›ºå®šdÃ­asæ•°åœ¨è·¨é—°å¹´æ—¶ä¼šæ¯”æ³•å®šPlazoæ—©ä¸€dÃ­asï¼ˆå¦‚åŠ¨äº§ä¸¤å¹´ 2027-06-15 èµ·ï¼Œ
 * 730 dÃ­aså¾— 2029-06-14ï¼Œæ³•å®šåº”ä¸º 2029-06-15ï¼‰ï¼Œåå·®æ–¹å‘è™½å®‰å…¨ä½†å±žç®—é”™ã€‚
 */
export function defaultExpiryDate(startDate: Date, propertyType: PropertyType): Date {
  return computeDeadlineDate(startDate, preservationDurationYears(propertyType), "YEARS");
}

/**
 * é»˜è®¤PlazoæŠ˜ç®—æˆdÃ­asæ•°ï¼Œä¾›ã€ŒPreservaciÃ³nPlazoï¼ˆdÃ­asï¼‰ã€è¾“å…¥æ¡†æ˜¾ç¤ºã€‚
 *
 * éšèµ·ç®—æ—¥å˜åŒ–ï¼ˆé—°å¹´å¤šä¸€dÃ­asï¼‰ï¼Œæ‰€ä»¥å¿…é¡»ä¼  startDateï¼Œä¸èƒ½å†™æˆå¸¸é‡è¡¨â€”â€”
 * å†™æˆå¸¸é‡æ­£æ˜¯æ—§å®žçŽ°ç®—é”™çš„Motivoã€‚
 */
export function defaultDurationDays(startDate: Date, propertyType: PropertyType): number {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = defaultExpiryDate(startDate, propertyType);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

/** èµ·ç®—æ—¥ + N dÃ­asï¼ŒæŒ‰æœ¬åœ°æ—¥åŽ†æŽ¨è¿›ï¼ˆä¸ç”¨æ¯«ç§’åŠ æ³•ï¼‰ */
export function addDays(startDate: Date, days: number): Date {
  const out = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  out.setDate(out.getDate() + days);
  return out;
}

