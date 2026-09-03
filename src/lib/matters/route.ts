/**
 * Casoè¯¦æƒ…é¡µçš„ URL è§„åˆ™ï¼ˆv1.2ï¼‰ã€‚
 *
 * è·¯ç”±é”®ä»Ž cuid æ¢æˆ `internalCode`ï¼ˆå½¢å¦‚ `LL-2026-CC-0001`ï¼‰ï¼š
 * ç¼–å·å¿…å¡«ã€`@unique`ã€ä¸”åªåœ¨CasoCrearæ—¶ç”Ÿæˆä¸€æ¬¡ï¼Œå…¨ä»“åº“æ²¡æœ‰Actualizarå®ƒçš„å†™å…¥è·¯å¾„ï¼Œ
 * å› æ­¤å¯ä»¥å®‰å…¨åœ°å½“ä½œ URL çš„ç¨³å®šæ ‡è¯†ã€‚
 *
 * ä¸ç”¨ `firmCaseNo`ï¼ˆæ‰€å†…æ¡ˆå·ï¼‰ï¼šå®ƒå«ä¸­æ–‡å’Œæ‹¬å·ï¼Œè¿› URL è¦ç™¾åˆ†å·CÃ³digoï¼›
 * ä¸”æŒ‰ã€ŒConfiguraciÃ³n â†’ å¾‹æ‰€ä¿¡æ¯ã€çš„æ¨¡æ¿æ¸²æŸ“ï¼Œæ¨¡æ¿å¯é…ç½® = å¯å˜ï¼Œä¼šè®©æ—§Enlaceå¤±æ•ˆã€‚
 * ä¹Ÿä¸æŠŠCasoæ ‡é¢˜åšæˆ slugï¼šæ ‡é¢˜å«å½“äº‹äººNombre y apellidoï¼Œå±ž PIIï¼Œä¸è¿› URLï¼ˆè§ AGENTS.md Â§å…«ï¼‰ã€‚
 */

/**
 * `internalCode` æœ‰æ„è®¾ä¸ºå¿…å¡«å±žæ€§ï¼ˆå€¼å¯ç©ºï¼‰ï¼šæ¼ä¼ æ—¶ TypeScript ç›´æŽ¥æŠ¥é”™ï¼Œ
 * é€¼è°ƒç”¨æ–¹æŠŠå­—æ®µä»ŽæŸ¥è¯¢é‡ŒæŽ¥å‡ºæ¥ï¼›å¦åˆ™ä¼šé™é»˜é€€å›ž cuidï¼Œåœ°å€æ‚„æ‚„å˜å›žéšæœºä¸²ã€‚
 */
type MatterRouteKey = {
  id: string;
  internalCode: string | null;
};

/** Casoè¯¦æƒ…é¡µåœ°å€ã€‚æ²¡æœ‰ internalCode æ—¶å›žé€€åˆ° idï¼Œä¿è¯Enlaceå§‹ç»ˆå¯ç”¨ã€‚ */
export function matterHref(matter: MatterRouteKey, suffix = ""): string {
  const key = matter.internalCode?.trim() || matter.id;
  return `/matters/${encodeURIComponent(key)}${suffix}`;
}

/**
 * è§„èŒƒåŒ–è·¯ç”±å‚æ•°ï¼šURL è§£ç  + åŽ»ç©ºç™½ + è½¬å¤§å†™ã€‚
 * ç¼–å·é‡Œçš„å­—æ¯æ’ä¸ºå¤§å†™ï¼Œå…è®¸ç”¨æˆ·æ‰‹æ‰“å°å†™åœ°å€ï¼ˆ`m-2026-001`ï¼‰ä¹Ÿèƒ½å‘½ä¸­ã€‚
 */
export function normalizeMatterParam(param: string): string {
  let decoded = param;
  try {
    decoded = decodeURIComponent(param);
  } catch {
    // å‚æ•°é‡Œæœ‰è£¸ `%` æ—¶ decodeURIComponent ä¼šæŠ›ï¼Œä¿æŒåŽŸå€¼ç»§ç»­èµ°æŸ¥è¯¢å³å¯
  }
  return decoded.trim().toUpperCase();
}

