"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanLeadMatter } from "@/lib/permissions";
import { revalidateMatter } from "@/server/matters/route";

const closeMatterSchema = z.object({
  id: z.string().cuid(),
  summary: z.string().min(1, "Cerrar casoå°ç»“å¿…å¡«").max(2000)
});

const holdMatterSchema = z.object({
  id: z.string().cuid(),
  reason: z.string().max(500).optional().or(z.literal(""))
});

export type CloseMatterInput = z.infer<typeof closeMatterSchema>;
export type HoldMatterInput = z.infer<typeof holdMatterSchema>;

/**
 * Cerrar casoï¼šæŠŠCasoEstadoåˆ‡åˆ° CLOSEDï¼Œè®°å½•Cerrar casoå°ç»“åˆ° TimelineEventã€‚
 * ä¸å¼ºåˆ¶è¦æ±‚æ‰€æœ‰ procedure éƒ½ concludedï¼ŒAbogadoè‡ªè¡Œåˆ¤æ–­ã€‚
 */
export async function closeMatter(input: CloseMatterInput) {
  const session = await requireSession();
  const data = closeMatterSchema.parse(input);
  await assertMatterWritable(data.id);
  await assertCanLeadMatter(session.user.id, data.id, "ä»…Casoä¸»åŠž/ååŠžå¯ä»¥Cerrar caso");

  await prisma.$transaction(async (tx) => {
    await tx.matter.update({
      where: { id: data.id },
      data: {
        status: "CLOSED",
        closedAt: new Date()
      }
    });
    await tx.timelineEvent.create({
      data: {
        matterId: data.id,
        eventType: "MATTER_CLOSED",
        title: "Casoå·²Cerrar caso",
        content: data.summary,
        occurredAt: new Date()
      }
    });
  });

  await audit({
    userId: session.user.id,
    action: "MATTER_CLOSE",
    targetType: "Matter",
    targetId: data.id,
    detail: { summaryLen: data.summary.length }
  });

  await revalidateMatter(data.id);
  revalidatePath("/matters");
  return { ok: true };
}

/**
 * å½’æ¡£ï¼šå®Œæ•´æµç¨‹è§ src/server/archive/actions.ts â†’ archiveMatter
 * è¿™é‡Œä¸å†ä¿ç•™æ—§çš„è½»é‡ç‰ˆæœ¬ï¼ˆv0.9.4 èµ·ç»Ÿä¸€èµ° ArchiveWizardï¼‰ã€‚
 */

/**
 * é‡æ–°å¼€æ”¾ï¼ˆä»Ž ON_HOLD / CLOSED å›žåˆ° IN_PROGRESSï¼‰ã€‚
 * ARCHIVED Estadoä¸èƒ½é‡æ–°å¼€æ”¾ï¼ˆå¦‚éœ€è¦åº”ç”± ADMIN èµ°å•ç‹¬è·¯å¾„ï¼‰ã€‚
 */
export async function reopenMatter(id: string) {
  const session = await requireSession();
  const matter = await prisma.matter.findUnique({ where: { id }, select: { status: true } });
  if (!matter) throw new Error("Casoä¸å­˜åœ¨");
  await assertMatterWritable(id);
  await assertCanLeadMatter(session.user.id, id, "ä»…Casoä¸»åŠž/ååŠžå¯ä»¥é‡æ–°å¼€æ”¾Caso");
  if (matter.status === "ARCHIVED") {
    throw new Error("å·²å½’æ¡£Casoä¸èƒ½é‡æ–°å¼€æ”¾");
  }

  await prisma.$transaction(async (tx) => {
    await tx.matter.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        closedAt: null
      }
    });
    await tx.timelineEvent.create({
      data: {
        matterId: id,
        eventType: "MATTER_REOPENED",
        title: "Casoå·²é‡æ–°å¼€æ”¾",
        occurredAt: new Date()
      }
    });
  });

  await audit({
    userId: session.user.id,
    action: "MATTER_REOPEN",
    targetType: "Matter",
    targetId: id
  });

  await revalidateMatter(id);
  revalidatePath("/matters");
  return { ok: true };
}

/**
 * æš‚åœCasoï¼ˆClienteå¤±è”ã€å¾…è¡¥å……ææ–™etc.ï¼‰ã€‚
 */
export async function holdMatter(input: HoldMatterInput) {
  const session = await requireSession();
  const data = holdMatterSchema.parse(input);
  await assertMatterWritable(data.id);
  await assertCanLeadMatter(session.user.id, data.id, "ä»…Casoä¸»åŠž/ååŠžå¯ä»¥æš‚åœCaso");

  await prisma.$transaction(async (tx) => {
    await tx.matter.update({
      where: { id: data.id },
      data: { status: "ON_HOLD" }
    });
    await tx.timelineEvent.create({
      data: {
        matterId: data.id,
        eventType: "MATTER_ON_HOLD",
        title: "Casoå·²æš‚åœ",
        content: data.reason || undefined,
        occurredAt: new Date()
      }
    });
  });

  await audit({
    userId: session.user.id,
    action: "MATTER_HOLD",
    targetType: "Matter",
    targetId: data.id,
    detail: { reason: data.reason }
  });

  await revalidateMatter(data.id);
  revalidatePath("/matters");
  return { ok: true };
}


