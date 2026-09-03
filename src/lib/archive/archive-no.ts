/**
 * v0.9.4 å½’æ¡£ç¼–å·ç”Ÿæˆ
 *
 * æ ¼å¼ï¼šYYYY-ç±»åˆ«-NNNN
 *   - YYYY = å½’æ¡£å¹´ä»½ï¼ˆarchivedAt å½“å¹´ï¼‰
 *   - ç±»åˆ«ç®€ç§° = 1 ä¸ªæ±‰å­—
 *   - NNNN = å¹´å†…åŒç±»åˆ«å½’æ¡£åºå·ï¼ˆé›¶å¡« 4 ä½ï¼Œä»Ž 0001 èµ·ï¼‰
 *
 * ç¤ºä¾‹ï¼š2026-æ°‘-0017
 *
 * å¹¶å‘ï¼šä¾èµ– @@unique(archiveNo)ã€‚é‡å¤æ—¶å›žåˆ°æŸ¥ max å† +1ï¼ˆæœ€å¤šé‡è¯• 3 æ¬¡ï¼‰ã€‚
 */
import type { MatterCategory } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

const CATEGORY_SHORT: Record<MatterCategory, string> = {
  CIVIL_COMMERCIAL: "æ°‘",
  LABOR_ARBITRATION: "åŠ³",
  COMMERCIAL_ARBITRATION: "å•†",
  CRIMINAL: "åˆ‘",
  ADMINISTRATIVE: "è¡Œ",
  NON_LITIGATION: "éž",
  LEGAL_COUNSEL: "é¡¾",
  SPECIAL_PROJECT: "ä¸“"
};

export function categoryShort(category: MatterCategory): string {
  return CATEGORY_SHORT[category] ?? "æ¡ˆ";
}

export async function nextArchiveNo(
  tx: Pick<PrismaClient, "archiveRecord">,
  category: MatterCategory,
  archivedAt: Date = new Date()
): Promise<string> {
  const year = archivedAt.getFullYear();
  const short = categoryShort(category);
  const prefix = `${year}-${short}-`;

  // å–å¹´å†…åŒå‰ç¼€çš„æœ€å¤§ archiveNo
  const existing = await tx.archiveRecord.findMany({
    where: { archiveNo: { startsWith: prefix } },
    select: { archiveNo: true },
    orderBy: { archiveNo: "desc" },
    take: 1
  });

  let next = 1;
  if (existing.length > 0) {
    const m = existing[0].archiveNo.match(/-(\d{4})$/);
    if (m) next = parseInt(m[1], 10) + 1;
  }

  return `${prefix}${String(next).padStart(4, "0")}`;
}

