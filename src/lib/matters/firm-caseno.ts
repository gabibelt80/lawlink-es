/**
 * v0.42 æ‰€å†…æ¡ˆå·æ¨¡æ¿æ¸²æŸ“ï¼ˆçº¯å‡½æ•°ï¼Œæ—  DB ä¾èµ–ï¼Œä¾¿äºŽå•æµ‹ï¼‰
 *
 * æ”¯æŒ tokenï¼š
 *   {å¹´}   å››ä½å¹´ä»½        {å¹´2}  ä¸¤ä½å¹´ä»½
 *   {æ‰€}   å¾‹æ‰€ç®€ç§°        {ç±»}   ç±»åˆ«å•å­—ï¼ˆæ°‘/åˆ‘â€¦ï¼‰  {ç±»è¯}  ç±»åˆ«è¯ï¼ˆæ°‘è¯‰/åˆ‘è¾©â€¦ï¼‰
 *   {åº3}  ä¸‰ä½æµæ°´         {åº4}  å››ä½æµæ°´
 *
 * é»˜è®¤æ¨¡æ¿ `{å¹´}-{æ‰€}{ç±»è¯}-{åº3}` + æ‰€ç®€ç§°ã€Œæ™®ã€+ ç±»è¯ã€Œæ°‘è¯‰ã€â†’ `2026-æ™®æ°‘è¯‰-001`ã€‚
 */
export interface CaseNoTokens {
  year: number;
  firmShortName: string;
  categoryAbbr: string;
  categoryWord: string;
  seq: number;
}

export function renderCaseNoTemplate(template: string, t: CaseNoTokens): string {
  return template
    .replace(/\{å¹´2\}/g, String(t.year).slice(-2))
    .replace(/\{å¹´\}/g, String(t.year))
    .replace(/\{æ‰€\}/g, t.firmShortName)
    .replace(/\{ç±»è¯\}/g, t.categoryWord)
    .replace(/\{ç±»\}/g, t.categoryAbbr)
    .replace(/\{åº4\}/g, String(t.seq).padStart(4, "0"))
    .replace(/\{åº3\}/g, String(t.seq).padStart(3, "0"));
}

