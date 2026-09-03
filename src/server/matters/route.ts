import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { matterHref, normalizeMatterParam } from "@/lib/matters/route";

/**
 * æŠŠè¯¦æƒ…é¡µè·¯ç”±å‚æ•°è§£æžæˆCasoä¸»é”®ã€‚
 *
 * ä¸åŽ»çŒœå‚æ•°å½¢çŠ¶ï¼ˆcuid è¿˜æ˜¯ç¼–å·ï¼‰ï¼Œç›´æŽ¥è®©æ•°æ®åº“åŒæ—¶Coincidenciaä¸¤è€…ï¼š
 * `internalCode` æœ‰å”¯ä¸€ç´¢å¼•ï¼Œcuid ä¸å« `-`ã€ç¼–å·å¿…å«ï¼Œä¸¤è€…ä¸å¯èƒ½æ’žï¼Œ
 * ä¸€æ¬¡æŸ¥è¯¢å³å¯ï¼Œä¹Ÿä¸ç”¨ä¸º cuid çš„å…·ä½“æ ¼å¼ï¼ˆv1/v2ï¼‰å†™æ­£åˆ™ã€‚
 *
 * Volver `internalCode` ä¾›è°ƒç”¨æ–¹åˆ¤æ–­æ˜¯å¦éœ€è¦é‡å®šå‘åˆ°è§„èŒƒåœ°å€ã€‚
 */
export async function resolveMatterRoute(
  param: string
): Promise<{ id: string; internalCode: string } | null> {
  const normalized = normalizeMatterParam(param);

  const matter = await prisma.matter.findFirst({
    where: {
      deletedAt: null,
      OR: [{ id: param }, { internalCode: normalized }]
    },
    select: { id: true, internalCode: true }
  });

  return matter;
}

/**
 * åªæ‹¿å¾—åˆ° matterId æ—¶çš„è¯¦æƒ…é¡µåœ°å€ï¼ˆNotificaciones href ä¼šè½åº“ï¼Œå¿…é¡»ç”¨ç¨³å®šçš„ç¼–å·ï¼‰ã€‚
 */
export async function matterHrefById(matterId: string): Promise<string> {
  const matter = await prisma.matter.findUnique({
    where: { id: matterId },
    select: { internalCode: true }
  });
  return matterHref({ id: matterId, internalCode: matter?.internalCode ?? null });
}

/**
 * è®©Casoè¯¦æƒ…é¡µçš„ç¼“å­˜å¤±æ•ˆã€‚
 *
 * è¯¦æƒ…é¡µè·¯ç”±é”®æ˜¯ `internalCode`ï¼Œè€Œå„ server action æ‰‹é‡Œåªæœ‰ matterIdï¼Œ
 * ç›´æŽ¥ `revalidatePath(`/matters/${matterId}`)` ä¼šæ‰“åˆ°ä¸€ä¸ªä¸å­˜åœ¨çš„è·¯å¾„ã€
 * é™é»˜å¤±æ•ˆï¼ˆè¡¨çŽ°ä¸ºæ”¹å®Œæ•°æ®åŽå›žé€€ä»çœ‹åˆ°æ—§å†…å®¹ï¼Œä¸æŠ¥é”™ï¼‰ã€‚
 * ç»Ÿä¸€èµ°è¿™é‡Œæ¢ç®—ï¼Œé¿å…æ¯ä¸ª action å„è‡ªæ‹¼è·¯å¾„ã€‚
 */
export async function revalidateMatter(matterId: string | null | undefined): Promise<void> {
  if (!matterId) return;

  const matter = await prisma.matter.findUnique({
    where: { id: matterId },
    select: { internalCode: true }
  });
  if (!matter) return;

  revalidatePath(`/matters/${encodeURIComponent(matter.internalCode)}`);
}


