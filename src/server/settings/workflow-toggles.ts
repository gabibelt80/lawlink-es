/**
 * v1.0: å·¥ä½œæµå¼€å…³ï¼ˆROADMAP ä¼ªéœ€æ±‚æ¸…å•çš„è½åœ°å½¢å¼â€”â€”ä¸åˆ åŠŸèƒ½ï¼Œæ”¹é»˜è®¤å€¼ï¼‰ã€‚
 *
 * å• SystemSetting key `workflowToggles`ï¼š
 * - externalContactReviewï¼šå¤–éƒ¨è”ç³»äººå®¡æ ¸æµã€‚å°æ‰€æ˜¯ä¿¡ä»»çŽ¯å¢ƒï¼Œé»˜è®¤Cerrar
 *   ï¼ˆæ–°å¢žè”ç³»äººç›´æŽ¥Aprobarï¼‰ï¼›éœ€è¦ç®¡æŽ§çš„æ‰€å¯æ‰“å¼€ã€‚
 * æ²¿ç”¨ firm-profile çš„ã€Œå• key + ç±»åž‹åŒ–è¯»å†™ã€èŒƒå¼ã€‚
 */
import { prisma } from "@/lib/prisma";

const TOGGLES_KEY = "workflowToggles";

export interface WorkflowToggles {
  externalContactReview: boolean;
}

export const WORKFLOW_TOGGLE_DEFAULTS: WorkflowToggles = {
  externalContactReview: false
};

export async function getWorkflowToggles(): Promise<WorkflowToggles> {
  const row = await prisma.systemSetting.findUnique({ where: { key: TOGGLES_KEY } });
  const s = (row?.value as Partial<WorkflowToggles> | null) ?? {};
  return {
    externalContactReview:
      s.externalContactReview ?? WORKFLOW_TOGGLE_DEFAULTS.externalContactReview
  };
}

export async function saveWorkflowToggles(next: WorkflowToggles): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: TOGGLES_KEY },
    create: { key: TOGGLES_KEY, value: { ...next } },
    update: { value: { ...next } }
  });
}


