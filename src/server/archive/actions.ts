"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { createNotification } from "@/server/notifications/create";
import {
  checklistForCategory,
  evaluateChecklist,
} from "@/lib/archive/checklists";
import { nextArchiveNo } from "@/lib/archive/archive-no";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanLeadMatter } from "@/lib/permissions";
import { renderArchiveCover, renderArchiveCatalog } from "./render";
import {
  archiveSubmitSchema,
  type ArchiveSubmitInput,
  CLOSED_REASON_CN,
} from "./schemas";
import { matterHref } from "@/lib/matters/route";
import { revalidateMatter } from "@/server/matters/route";

/**
 * v0.9.4 å½’æ¡£ï¼šå®Œæ•´æµç¨‹
 *   1. æƒé™ï¼šæœ¬æ¡ˆä¸»åŠž / ååŠžEnviarï¼ŒADMIN AprobaciÃ³n
 *   2. æ ¡éªŒ checklist ç¼ºå¿…å¡«Ã­tems â†’ è‹¥æœ‰ä¸”æœª forceWithMissing åˆ™æ‹’ç»
 *   3. ç”Ÿæˆ archiveNo
 *   4. æ¸²æŸ“å·å®—å°çš® â†’ å…¥ ARCHIVE å·å®—
 *   5. æ¸²æŸ“å·å®—ç›®å½•ï¼ˆå«å·²ç”Ÿæˆçš„å°çš®è‡ªèº«å¯é€‰ä¸å…¥ç›®å½•ï¼‰
 *   6. Crear ArchiveRecord
 *   7. Matter status=ARCHIVED + archivedAt + closedAt
 *   8. TimelineEvent + audit
 */
export async function archiveMatter(input: ArchiveSubmitInput) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const data = archiveSubmitSchema.parse(input);

  await assertMatterWritable(data.matterId);
  await assertCanLeadMatter(
    session.user.id,
    data.matterId,
    "Solo el responsable del Caso / co-responsable puede enviar la solicitud de archivo",
  );

  const matter = await prisma.matter.findUnique({
    where: { id: data.matterId },
    select: {
      id: true,
      status: true,
      category: true,
      internalCode: true,
      title: true,
    },
  });
  if (!matter) throw new Error("El Caso no existe");
  if (matter.status === "ARCHIVED")
    throw new Error("El Caso ya estÃ¡ archivado");

  // checklist ç¼ºÃ­temsæ ¡éªŒ
  const checklist = checklistForCategory(matter.category);
  const { missingRequired } = evaluateChecklist(checklist, data.checklist);
  if (missingRequired.length > 0 && !data.forceWithMissing) {
    throw new Error(
      `La lista de archivo tiene ${missingRequired.length} campos obligatorios faltantes: ${missingRequired.map((x) => x.label).join(", ")}. Si confirmÃ¡s el archivo forzado, marcÃ¡ "Archivo forzado".`,
    );
  }
  const missingItems = missingRequired.map((x) => x.id);

  // æ¸²æŸ“å¿…é¡»åœ¨äº‹åŠ¡å¤–ï¼ˆæ¶‰yæ–‡ä»¶Sistema + åŠ å¯†ï¼‰ã€‚å…ˆæ¸²æŸ“å†äº‹åŠ¡é‡Œå»ºè®°å½•ã€‚
  const now = new Date();
  const archiveNo = await nextArchiveNo(prisma, matter.category, now);

  const extras = {
    archiveNo,
    closedReason: data.closedReason,
    completedAt: data.completedAt,
    archivedAt: now,
    judgmentSummary: data.judgmentSummary || undefined,
  };

  let coverDocId: string;
  try {
    coverDocId = await renderArchiveCover(prisma, {
      matterId: matter.id,
      userId: session.user.id,
      extras,
    });
  } catch (err) {
    throw new Error(
      `Error al renderizar la portada del expediente: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  let catalogDocId: string;
  try {
    catalogDocId = await renderArchiveCatalog(prisma, {
      matterId: matter.id,
      userId: session.user.id,
      extras,
      excludeDocIds: [coverDocId],
    });
  } catch (err) {
    // å°çš®å·²è½åº“ï¼›ç›®å½•Erroræ—¶å›žæ»šå°çš®æ–‡æ¡£ï¼ˆæ ‡è®°è½¯åˆ ï¼‰ã€‚Abogadoé‡è¯•å¯é‡æ–°ç”Ÿæˆã€‚
    await prisma.document
      .update({
        where: { id: coverDocId },
        data: { deletedAt: new Date() },
      })
      .catch(() => null);
    throw new Error(
      `Error al renderizar el Ã­ndice del expediente: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.archiveRecord.create({
      data: {
        matterId: matter.id,
        archiveNo,
        summary: data.summary,
        judgmentSummary: data.judgmentSummary || null,
        closedReason: data.closedReason,
        completedAt: data.completedAt,
        checklistJson: data.checklist as Prisma.InputJsonValue,
        missingItems,
        coverDocId,
        catalogDocId,
        archivedBy: session.user.name ?? session.user.id,
        archivedById: session.user.id,
        status: "PENDING_REVIEW",
        reviewedById: null,
        reviewedAt: null,
      },
    });

    await tx.timelineEvent.create({
      data: {
        matterId: matter.id,
        eventType: "MATTER_ARCHIVE_REQUESTED",
        title: `Se enviÃ³ la solicitud de archivo (${archiveNo}, pendiente de aprobaciÃ³n)`,
        content: `Modo de cierre: ${CLOSED_REASON_CN[data.closedReason]}ã€‚${data.summary}`,
        occurredAt: now,
      },
    });
  });

  await audit({
    userId: session.user.id,
    action: "MATTER_ARCHIVE",
    targetType: "Matter",
    targetId: matter.id,
    detail: {
      archiveNo,
      closedReason: data.closedReason,
      missingCount: missingItems.length,
      forced: data.forceWithMissing && missingItems.length > 0,
    },
  });

  await revalidateMatter(matter.id);
  revalidatePath("/matters");
  revalidatePath("/archive");
  return { ok: true, archiveNo, status: "PENDING_REVIEW" };
}

/**
 * v0.16: Administrarå‘˜AprobaciÃ³nAprobarå½’æ¡£ç”³è¯·ï¼ˆPENDING_REVIEW â†’ APPROVEDï¼‰
 */
export async function approveArchiveRecord(input: {
  archiveId: string;
  note?: string;
}) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error(
      "Solo el Administrador puede aprobar esta solicitud de archivo",
    );
  }

  const record = await prisma.archiveRecord.findUnique({
    where: { id: input.archiveId },
    select: {
      id: true,
      matterId: true,
      status: true,
      completedAt: true,
      archiveNo: true,
      archivedById: true,
    },
  });
  if (!record) throw new Error("La solicitud de archivo no existe");
  if (record.status !== "PENDING_REVIEW")
    throw new Error("Esta solicitud de archivo ya fue aprobada");

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.archiveRecord.update({
      where: { id: record.id },
      data: {
        status: "APPROVED",
        reviewedById: session.user.id,
        reviewedAt: now,
        reviewNote: input.note?.trim() || null,
      },
    });
    await tx.matter.update({
      where: { id: record.matterId },
      data: {
        status: "ARCHIVED",
        archivedAt: now,
        closedAt: record.completedAt,
      },
    });
    await tx.timelineEvent.create({
      data: {
        matterId: record.matterId,
        eventType: "MATTER_ARCHIVED",
        title: `El Caso ha sido archivado (${record.archiveNo})`,
        content: input.note?.trim()
          ? `AprobaciÃ³n del Administrador: ${input.note.trim()}`
          : "AprobaciÃ³n del Administrador aprobada",
        occurredAt: now,
      },
    });
  });

  // v0.18: Notificacionesç”³è¯·äºº
  if (record.archivedById && record.archivedById !== session.user.id) {
    const matter = await prisma.matter.findUnique({
      where: { id: record.matterId },
      select: { title: true, internalCode: true },
    });
    await createNotification({
      userId: record.archivedById,
      type: "ARCHIVE_APPROVED",
      priority: "NORMAL",
      title: `La solicitud de archivo fue aprobada (${record.archiveNo})`,
      content: `La solicitud de archivo del Caso ${matter?.internalCode ?? record.matterId}Â·${matter?.title ?? ""} fue aprobada por el Administrador.`,
      href: matterHref({
        id: record.matterId,
        internalCode: matter?.internalCode ?? null,
      }),
      refType: "ArchiveRecord",
      refId: record.id,
    });
  }

  await audit({
    userId: session.user.id,
    action: "ARCHIVE_APPROVE",
    targetType: "ArchiveRecord",
    targetId: record.id,
    detail: { matterId: record.matterId, archiveNo: record.archiveNo },
  });

  await revalidateMatter(record.matterId);
  revalidatePath("/matters");
  revalidatePath("/archive");
  return { ok: true };
}

/**
 * v0.16: Administrarå‘˜Rechazarå½’æ¡£ç”³è¯·
 */
export async function rejectArchiveRecord(input: {
  archiveId: string;
  note: string;
}) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error(
      "Solo el Administrador puede rechazar la solicitud de archivo",
    );
  }
  if (!input.note.trim()) throw new Error("Ingresa¡ el motivo del rechazo");

  const record = await prisma.archiveRecord.findUnique({
    where: { id: input.archiveId },
    select: {
      id: true,
      matterId: true,
      status: true,
      archiveNo: true,
      archivedById: true,
    },
  });
  if (!record) throw new Error("La solicitud de archivo no existe");
  if (record.status !== "PENDING_REVIEW")
    throw new Error("Esta solicitud de archivo ya fue aprobada");

  await prisma.archiveRecord.update({
    where: { id: record.id },
    data: {
      status: "REJECTED",
      reviewedById: session.user.id,
      reviewedAt: new Date(),
      reviewNote: input.note.trim(),
    },
  });

  // v0.18: Notificacionesç”³è¯·äºº
  if (record.archivedById && record.archivedById !== session.user.id) {
    const matter = await prisma.matter.findUnique({
      where: { id: record.matterId },
      select: { title: true, internalCode: true },
    });
    await createNotification({
      userId: record.archivedById,
      type: "ARCHIVE_REJECTED",
      priority: "HIGH",
      title: `La solicitud de archivo fue rechazada (${record.archiveNo})`,
      content: `La solicitud de archivo del Caso ${matter?.internalCode ?? record.matterId}Â·${matter?.title ?? ""} fue rechazada. Motivo: ${input.note.trim()}`,
      href: matterHref({
        id: record.matterId,
        internalCode: matter?.internalCode ?? null,
      }),
      refType: "ArchiveRecord",
      refId: record.id,
    });
  }

  await audit({
    userId: session.user.id,
    action: "ARCHIVE_REJECT",
    targetType: "ArchiveRecord",
    targetId: record.id,
    detail: {
      matterId: record.matterId,
      archiveNo: record.archiveNo,
      note: input.note.trim(),
    },
  });

  await revalidateMatter(record.matterId);
  revalidatePath("/archive");
  return { ok: true };
}

/**
 * èŽ·å–Casoçš„å½’æ¡£å‡†å¤‡æ•°æ®ï¼šå½“å‰ checklist æ¨¡æ¿ + å·²æœ‰ ArchiveRecordï¼ˆè‹¥æœ‰ï¼‰
 */
export async function getArchivePrepData(matterId: string) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  await assertCanLeadMatter(
    session.user.id,
    matterId,
    "ä»…Casoä¸»åŠž/ååŠžå¯ä»¥å‡†å¤‡å½’æ¡£",
  );
  const matter = await prisma.matter.findUnique({
    where: { id: matterId },
    select: {
      id: true,
      title: true,
      internalCode: true,
      category: true,
      status: true,
      closedAt: true,
      archivedAt: true,
      archiveRecords: {
        orderBy: { archivedAt: "desc" },
        take: 1,
        select: {
          archiveNo: true,
          summary: true,
          judgmentSummary: true,
          closedReason: true,
          completedAt: true,
          checklistJson: true,
          missingItems: true,
          coverDocId: true,
          catalogDocId: true,
          archivedBy: true,
          archivedAt: true,
        },
      },
    },
  });
  if (!matter) throw new Error("Casoä¸å­˜åœ¨");

  const checklist = checklistForCategory(matter.category);

  // v0.11: å–æœ€è¿‘ä¸€æ¬¡Cerrar casoäº‹ä»¶çš„ content ä½œä¸ºé¢„å¡«å°ç»“
  const lastCloseEvent = await prisma.timelineEvent.findFirst({
    where: { matterId, eventType: "MATTER_CLOSED" },
    orderBy: { occurredAt: "desc" },
    select: { content: true },
  });

  // v0.17: å·²ä¸Šä¼ å¹¶å…³è”åˆ° checklist item çš„ææ–™ï¼ˆç”¨äºŽå‘å¯¼è‡ªåŠ¨å‹¾é€‰ï¼‰
  const linkedDocs = await prisma.document.findMany({
    where: {
      matterId,
      deletedAt: null,
      archiveChecklistItemId: { not: null },
    },
    select: {
      id: true,
      name: true,
      archiveChecklistItemId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // itemId â†’ å…³è”ææ–™åˆ—è¡¨ï¼ˆä¿ç•™Ver todosï¼ŒUI å±•ç¤ºé¦–æ¡ + ä½™æ•°ï¼‰
  const docsByItem: Record<string, { id: string; name: string }[]> = {};
  for (const d of linkedDocs) {
    const key = d.archiveChecklistItemId!;
    (docsByItem[key] ??= []).push({ id: d.id, name: d.name });
  }

  return {
    matter,
    checklist,
    existingSummary: lastCloseEvent?.content ?? null,
    docsByItem,
  };
}

/**
 * å·²å½’æ¡£Casoåˆ—è¡¨ï¼ˆ/archive Totalè§ˆé¡µï¼‰â€”â€” ä»… status=APPROVED
 */
export async function listArchivedMatters() {
  const prisma = await getTenantPrisma();
  await requireSession();
  return prisma.archiveRecord.findMany({
    where: { status: "APPROVED" },
    orderBy: { archivedAt: "desc" },
    take: 200,
    select: {
      id: true,
      archiveNo: true,
      summary: true,
      closedReason: true,
      completedAt: true,
      archivedAt: true,
      archivedBy: true,
      missingItems: true,
      matter: {
        select: {
          id: true,
          title: true,
          internalCode: true,
          firmCaseNo: true,
          category: true,
          primaryClient: { select: { name: true } },
        },
      },
    },
  });
}

/**
 * v0.17: å¾…AprobaciÃ³nå½’æ¡£ç”³è¯·åˆ—è¡¨ï¼ˆä»… ADMINï¼‰
 * /archive å¾…AprobaciÃ³n tab ä½¿ç”¨
 */
export async function listPendingArchiveRecords() {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("ä»…Administrarå‘˜å¯Verå¾…AprobaciÃ³nå½’æ¡£");
  }
  return prisma.archiveRecord.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { archivedAt: "asc" },
    take: 200,
    select: {
      id: true,
      archiveNo: true,
      summary: true,
      judgmentSummary: true,
      closedReason: true,
      completedAt: true,
      archivedAt: true,
      archivedBy: true,
      missingItems: true,
      checklistJson: true,
      matter: {
        select: {
          id: true,
          title: true,
          internalCode: true,
          firmCaseNo: true,
          category: true,
          primaryClient: { select: { name: true } },
        },
      },
    },
  });
}

/**
 * v0.18: Abogadoç«¯æŸ¥è¯¢è‡ªå·±çš„Rechazadoå½’æ¡£ç”³è¯·
 * ç”¨äºŽ"æˆ‘çš„Rechazadoå½’æ¡£"å…¥å£æˆ–Casoè¯¦æƒ…é¡µ banner
 */
export async function listRejectedArchiveRecords() {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  return prisma.archiveRecord.findMany({
    where: {
      archivedById: session.user.id,
      status: "REJECTED",
    },
    orderBy: { archivedAt: "desc" },
    take: 100,
    select: {
      id: true,
      archiveNo: true,
      matterId: true,
      summary: true,
      reviewedAt: true,
      reviewNote: true,
      matter: {
        select: {
          id: true,
          title: true,
          internalCode: true,
          status: true,
          archivedAt: true,
        },
      },
    },
  });
}

/**
 * v0.18: èŽ·å–Casoæœ€æ–°ä¸€æ¡ ArchiveRecordï¼ˆæ— è®ºEstadoï¼‰
 * Casoè¯¦æƒ…é¡µå±•ç¤º"å½’æ¡£ä¸­/Rechazado"Estado banner ç”¨
 */
export async function getLatestArchiveRecord(matterId: string) {
  const prisma = await getTenantPrisma();
  await requireSession();
  return prisma.archiveRecord.findFirst({
    where: { matterId },
    orderBy: { archivedAt: "desc" },
    select: {
      id: true,
      archiveNo: true,
      status: true,
      archivedAt: true,
      reviewedAt: true,
      reviewNote: true,
      archivedBy: true,
      missingItems: true,
    },
  });
}

/**
 * v0.20: æ‰¹é‡AprobaciÃ³n â€”â€” Aprobar
 *
 * å•æ¡ç‹¬ç«‹å¤„ç†ï¼ˆä¸å¼ºæ±‚åŽŸå­ï¼‰ï¼Œé€æ¡å¤ç”¨ approveArchiveRecord çš„äº‹åŠ¡ã€‚
 * Volver { succeeded, failed }ï¼Œfailed å«ErrorMotivoï¼Œå‰ç«¯å±•ç¤ºéƒ¨åˆ†Errorçš„æƒ…å†µã€‚
 */
export async function batchApproveArchiveRecords(input: {
  archiveIds: string[];
  note?: string;
}): Promise<{
  succeeded: string[];
  failed: { id: string; error: string }[];
}> {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("åªæœ‰Administrarå‘˜å¯ä»¥AprobaciÃ³nå½’æ¡£ç”³è¯·");
  }
  if (!input.archiveIds.length) throw new Error("æœªé€‰æ‹©ä»»ä½•å½’æ¡£ç”³è¯·");
  if (input.archiveIds.length > 100) throw new Error("å•æ¬¡æ‰¹é‡ä¸è¶…è¿‡ 100 æ¡");

  const succeeded: string[] = [];
  const failed: { id: string; error: string }[] = [];
  for (const id of input.archiveIds) {
    try {
      await approveArchiveRecord({ archiveId: id, note: input.note });
      succeeded.push(id);
    } catch (err) {
      failed.push({
        id,
        error: err instanceof Error ? err.message : "Desconocidoé”™è¯¯",
      });
    }
  }
  await audit({
    userId: session.user.id,
    action: "ARCHIVE_BATCH_APPROVE",
    targetType: "ArchiveRecord",
    targetId: input.archiveIds.join(","),
    detail: {
      total: input.archiveIds.length,
      succeeded: succeeded.length,
      failed: failed.length,
    },
  });
  return { succeeded, failed };
}

/**
 * v0.20: æ‰¹é‡AprobaciÃ³n â€”â€” Rechazarï¼ˆç»Ÿä¸€Motivoï¼‰
 */
export async function batchRejectArchiveRecords(input: {
  archiveIds: string[];
  note: string;
}): Promise<{
  succeeded: string[];
  failed: { id: string; error: string }[];
}> {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("åªæœ‰Administrarå‘˜å¯ä»¥Rechazarå½’æ¡£ç”³è¯·");
  }
  if (!input.archiveIds.length) throw new Error("æœªé€‰æ‹©ä»»ä½•å½’æ¡£ç”³è¯·");
  if (input.archiveIds.length > 100) throw new Error("å•æ¬¡æ‰¹é‡ä¸è¶…è¿‡ 100 æ¡");
  if (!input.note.trim()) throw new Error("è¯·å¡«å†™RechazarMotivo");

  const succeeded: string[] = [];
  const failed: { id: string; error: string }[] = [];
  for (const id of input.archiveIds) {
    try {
      await rejectArchiveRecord({ archiveId: id, note: input.note });
      succeeded.push(id);
    } catch (err) {
      failed.push({
        id,
        error: err instanceof Error ? err.message : "Desconocidoé”™è¯¯",
      });
    }
  }
  await audit({
    userId: session.user.id,
    action: "ARCHIVE_BATCH_REJECT",
    targetType: "ArchiveRecord",
    targetId: input.archiveIds.join(","),
    detail: {
      total: input.archiveIds.length,
      succeeded: succeeded.length,
      failed: failed.length,
      note: input.note.trim(),
    },
  });
  return { succeeded, failed };
}


