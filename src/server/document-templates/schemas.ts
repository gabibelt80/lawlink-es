import { z } from "zod";

export const templateListFilterSchema = z.object({
  category: z
    .enum([
      "INTAKE",
      "RETAINER",
      "LITIGATION",
      "HEARING",
      "WORK_PRODUCT",
      "ARCHIVE",
      "CLOSING",
      "BLANK"
    ])
    .optional(),
  matterCategory: z
    .enum([
      "CIVIL_COMMERCIAL",
      "CRIMINAL",
      "ADMINISTRATIVE",
      "NON_LITIGATION",
      "LEGAL_COUNSEL",
      "SPECIAL_PROJECT"
    ])
    .optional(),
  onlyEnabled: z.boolean().default(true)
});

export const templateToggleSchema = z.object({
  id: z.string().cuid(),
  enabled: z.boolean()
});

/**
 * æ¸²æŸ“æ¨¡æ¿ç”Ÿæˆæ–‡ä¹¦å¹¶å½’æ¡£ï¼ˆæ®µ 3 æ¨¡æ¿å¼•æ“Žå®žçŽ°ï¼‰ã€‚
 * - matterId: ç›®æ ‡Caso
 * - templateId: é€‰å®šæ¨¡æ¿
 * - folderId: ç›®æ ‡å·å®—ï¼ˆå¯ç©º = æ•£ä»¶ï¼‰
 * - overrides: è¡Œå†…è¡¥å…¨çš„å˜é‡ï¼ˆè·¯å¾„åŒ–é”®å€¼ï¼Œå¦‚ {"client.idNumber": "320..."})ï¼›è¡Œå†…è¡¥å…¨ä¼šå›žå†™æºè¡¨
 */
export const templateRenderSchema = z.object({
  matterId: z.string().cuid(),
  templateId: z.string().cuid(),
  folderId: z.string().cuid().nullable(),
  overrides: z.record(z.string()).default({})
});


