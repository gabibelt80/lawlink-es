import { Prisma } from "@prisma/client";
import type { MatterCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { matterCategoryCode } from "@/lib/procedures-by-category";
import { getFirmProfile, CATEGORY_ABBR } from "@/server/settings/firm-profile";
import { renderCaseNoTemplate } from "@/lib/matters/firm-caseno";

/** SystemSetting åŽŸå­è®¡æ•°å™¨ï¼škey è‡ªå¢žå¹¶Volveræ–°å€¼ï¼ˆserializable é˜²å¹¶å‘å†²çªï¼‰ */
async function nextCounter(key: string): Promise<number> {
  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.systemSetting.findUnique({ where: { key } });
      const current = (existing?.value as { value?: number })?.value ?? 0;
      const incremented = current + 1;
      await tx.systemSetting.upsert({
        where: { key },
        update: { value: { value: incremented } },
        create: { key, value: { value: incremented } }
      });
      return incremented;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/**
 * åŽŸå­ç”Ÿæˆ internalCodeï¼š{å‰ç¼€}-{YYYY}-{CODE}-{4ä½æµæ°´}
 *
 * å‰ç¼€å¯åœ¨ã€ŒConfiguraciÃ³n â†’ å¾‹æ‰€ä¿¡æ¯ã€é…ç½®ï¼ˆé»˜è®¤ LLï¼‰ã€‚è®¡æ•°å™¨ key å½¢å¦‚ `code-counter-2026-CC`ã€‚
 */
export async function generateInternalCode(category: MatterCategory): Promise<string> {
  const year = new Date().getFullYear();
  const code = matterCategoryCode[category];
  const { matterCodePrefix } = await getFirmProfile();

  const next = await nextCounter(`code-counter-${year}-${code}`);
  return `${matterCodePrefix}-${year}-${code}-${String(next).padStart(4, "0")}`;
}

/**
 * v0.42 ç”Ÿæˆæ‰€å†…æ¡ˆå·ï¼ˆÃ­tems 11ï¼‰ï¼šæŒ‰ã€ŒConfiguraciÃ³n â†’ å¾‹æ‰€ä¿¡æ¯ã€çš„æ¨¡æ¿æ¸²æŸ“ã€‚
 * è®¡æ•°å™¨æŒ‰ å¹´ + ç±»åˆ« ç‹¬ç«‹è‡ªå¢žï¼Œkey å½¢å¦‚ `firm-caseno-2026-CC`ã€‚
 * æ¨¡æ¿ä¸ºç©ºæ—¶å›žé€€é»˜è®¤ï¼›y internalCode è®¡æ•°å™¨äº’ä¸å¹²æ‰°ã€‚
 */
export async function generateFirmCaseNo(category: MatterCategory): Promise<string> {
  const year = new Date().getFullYear();
  const code = matterCategoryCode[category];
  const profile = await getFirmProfile();

  const seq = await nextCounter(`firm-caseno-${year}-${code}`);
  return renderCaseNoTemplate(profile.caseNoTemplate, {
    year,
    firmShortName: profile.firmShortName,
    categoryAbbr: CATEGORY_ABBR[category],
    categoryWord: profile.categoryWords[category],
    seq
  });
}


