import type { MatterCategory } from "@prisma/client";
import type { Prisma } from "@prisma/client";

/**
 * v0.8 é»˜è®¤å·å®—ç»“æž„ï¼ˆæŒ‰Casoç±»åˆ«ï¼‰
 * æ–°å»º Matter æ—¶è‡ªåŠ¨ seedï¼›isDefault=true ä¸å¯åˆ ï¼Œå¯æ”¹åã€‚
 */
export const DEFAULT_FOLDERS_BY_CATEGORY: Record<MatterCategory, readonly string[]> = {
  CIVIL_COMMERCIAL: ["æ”¶æ¡ˆ", "ç«‹æ¡ˆ", "å§”æ‰˜æ‰‹ç»­", "è¯æ®", "ç¨‹åºæ–‡ä¹¦", "åº­å®¡", "è£åˆ¤", "Cerrar caso"],
  LABOR_ARBITRATION: ["æ”¶æ¡ˆ", "å§”æ‰˜æ‰‹ç»­", "è¯æ®", "ä»²è£æ–‡ä¹¦", "å¼€åº­", "è£å†³", "è¯‰è®¼", "Cerrar caso"],
  COMMERCIAL_ARBITRATION: ["æ”¶æ¡ˆ", "å§”æ‰˜æ‰‹ç»­", "è¯æ®", "ä»²è£æ–‡ä¹¦", "å¼€åº­", "è£å†³", "Cerrar caso"],
  ADMINISTRATIVE: ["æ”¶æ¡ˆ", "ç«‹æ¡ˆ", "å§”æ‰˜æ‰‹ç»­", "è¯æ®", "ç¨‹åºæ–‡ä¹¦", "åº­å®¡", "è£åˆ¤", "Cerrar caso"],
  CRIMINAL: ["æ”¶æ¡ˆ", "å§”æ‰˜æ‰‹ç»­", "é˜…å·", "ä¼šè§", "å–è¯", "åº­å‰", "åº­å®¡", "åˆ¤å†³yä¸Šè¯‰", "Cerrar caso"],
  NON_LITIGATION: ["ç«‹Ã­tems", "è°ƒç ”", "å·¥ä½œåº•ç¨¿", "å‡ºå…·æ–‡ä»¶", "å½’æ¡£"],
  LEGAL_COUNSEL: ["ç«‹Ã­tems", "è°ƒç ”", "å·¥ä½œåº•ç¨¿", "å‡ºå…·æ–‡ä»¶", "å½’æ¡£"],
  SPECIAL_PROJECT: ["ç«‹Ã­tems", "è°ƒç ”", "å·¥ä½œåº•ç¨¿", "å‡ºå…·æ–‡ä»¶", "å½’æ¡£"]
} as const;

/**
 * åœ¨äº‹åŠ¡ä¸­ä¸ºæ–° Matter Crearé»˜è®¤å·å®—ã€‚
 * è°ƒç”¨æ–¹æä¾› txï¼›æœ¬å‡½æ•°åªå†™åº“ï¼Œä¸åšæƒé™/æ ¡éªŒã€‚
 */
export async function seedDefaultFolders(
  tx: Prisma.TransactionClient,
  matterId: string,
  category: MatterCategory
) {
  const names = DEFAULT_FOLDERS_BY_CATEGORY[category];
  if (!names || names.length === 0) return;
  await tx.documentFolder.createMany({
    data: names.map((name, i) => ({
      matterId,
      name,
      orderIndex: i,
      isDefault: true
    }))
  });
}

/**
 * æŒ‰æ¨¡æ¿å¤§ç±»æŽ¨èé»˜è®¤å½’æ¡£å·å®—åï¼ˆç”¨äºŽ"ä»Žæ¨¡æ¿æ–°å»º"æ—¶è‡ªåŠ¨é€‰ç›®æ ‡å·å®—ï¼‰ã€‚
 * æŽ¨èä¸åˆ°æ—¶Volver nullï¼Œç”± UI è®©ç”¨æˆ·æ‰‹é€‰ã€‚
 */
export function suggestFolderByTemplateCategory(
  templateCategory: string,
  matterCategory: MatterCategory
): string | null {
  const isLitigation =
    matterCategory === "CIVIL_COMMERCIAL" ||
    matterCategory === "ADMINISTRATIVE" ||
    matterCategory === "CRIMINAL";

  const mapLitigation: Record<string, string> = {
    INTAKE: "æ”¶æ¡ˆ",
    RETAINER: "å§”æ‰˜æ‰‹ç»­",
    LITIGATION: matterCategory === "CRIMINAL" ? "åº­å‰" : "ç¨‹åºæ–‡ä¹¦",
    HEARING: matterCategory === "CRIMINAL" ? "åº­å®¡" : "åº­å®¡",
    WORK_PRODUCT: matterCategory === "CRIMINAL" ? "å–è¯" : "è¯æ®",
    ARCHIVE: matterCategory === "CRIMINAL" ? "Cerrar caso" : "Cerrar caso",
    CLOSING: "Cerrar caso",
    BLANK: matterCategory === "CRIMINAL" ? "æ”¶æ¡ˆ" : "æ”¶æ¡ˆ"
  };

  const mapNonLitigation: Record<string, string> = {
    INTAKE: "ç«‹Ã­tems",
    RETAINER: "ç«‹Ã­tems",
    LITIGATION: "å‡ºå…·æ–‡ä»¶",
    HEARING: "å·¥ä½œåº•ç¨¿",
    WORK_PRODUCT: "å‡ºå…·æ–‡ä»¶",
    ARCHIVE: "å½’æ¡£",
    CLOSING: "å½’æ¡£",
    BLANK: "å·¥ä½œåº•ç¨¿"
  };

  const map = isLitigation ? mapLitigation : mapNonLitigation;
  return map[templateCategory] ?? null;
}

