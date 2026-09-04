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
 * v0.9.4 Archivo: flujo completo
 *   1. Permisos: responsable/co-responsable envia, ADMIN aprueba
 *   2. Verifica checklist de items obligatorios
 *   3. Genera numero de archivo
 *   4. Renderiza portada del expediente
 *   5. Renderiza indice del expediente
 *   6. Crea ArchiveRecord
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
    throw new Error("El Caso ya esta archivado");

  // Verificacion de items obligatorios del checklist
  const checklist = checklistForCategory(matter.category);
  const { missingRequired } = evaluateChecklist(checklist, data.checklist);
  if (missingRequired.length > 0 && !data.forceWithMissing) {
    throw new Error(
      `La lista de archivo tiene ${missingRequired.length} campos obligatorios faltantes: ${missingRequired.map((x) => x.label).join(", ")}. Si confirmas el archivo forzado, marca "Archivo forzado".`,
    );
  }
  const missingItems = missingRequired.map((x) => x.id);

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
    // Si falla el indice, se elimina la portada ya creada
    await prisma.document
      .update({
        where: { id: coverDocId },
        data: { deletedAt: new Date() },
      })
      .catch(() => null);
    throw new Error(
      `Error al renderizar el indice del expediente: ${err instanceof Error ? err.message : String(err)}`,
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
        title: `Se envio la solicitud de archivo (${archiveNo}, pendiente de aprobacion)`,
        content: `Modo de cierre: ${CLOSED_REASON_CN[data.closedReason]}. ${data.summary}`,
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
 * v0.16: Administrador aprueba solicitud de archivo (PENDING_REVIEW a APPROVED)
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
          ? `Aprobacion del Administrador: ${input.note.trim()}`
          : "Aprobacion del Administrador aprobada",
        occurredAt: now,
      },
    });
  });

  // Notificar al solicitante
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
      content: `La solicitud de archivo del Caso ${matter?.internalCode ?? record.matterId} - ${matter?.title ?? ""} fue aprobada por el Administrador.`,
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
 * v0.16: Administrador rechaza solicitud de archivo
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
  if (!input.note.trim()) throw new Error("Ingresa el motivo del rechazo");

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

  // Notificar al solicitante
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
      content: `La solicitud de archivo del Caso ${matter?.internalCode ?? record.matterId} - ${matter?.title ?? ""} fue rechazada. Motivo: ${input.note.trim()}`,
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
 * Obtiene datos de preparacion de archivo del Caso
 */
export async function getArchivePrepData(matterId: string) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  await assertCanLeadMatter(
    session.user.id,
    matterId,
    "Solo el responsable/co-responsable puede preparar el archivo",
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
  if (!matter) throw new Error("El Caso no existe");

  const checklist = checklistForCategory(matter.category);

  const lastCloseEvent = await prisma.timelineEvent.findFirst({
    where: { matterId, eventType: "MATTER_CLOSED" },
    orderBy: { occurredAt: "desc" },
    select: { content: true },
  });

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
 * Lista de casos archivados (solo status=APPROVED)
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
 * Lista de solicitudes de archivo pendientes (solo ADMIN)
 */
export async function listPendingArchiveRecords() {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("Solo el Administrador puede ver solicitudes pendientes");
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
 * Abogado consulta sus solicitudes rechazadas
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
 * Obtiene el ultimo ArchiveRecord del Caso (sin importar estado)
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
 * v0.20: Aprobacion por lotes - Aprobar
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
    throw new Error("Solo el Administrador puede aprobar solicitudes de archivo");
  }
  if (!input.archiveIds.length) throw new Error("No seleccionaste ninguna solicitud");
  if (input.archiveIds.length > 100) throw new Error("Maximo 100 solicitudes por lote");

  const succeeded: string[] = [];
  const failed: { id: string; error: string }[] = [];
  for (const id of input.archiveIds) {
    try {
      await approveArchiveRecord({ archiveId: id, note: input.note });
      succeeded.push(id);
    } catch (err) {
      failed.push({
        id,
        error: err instanceof Error ? err.message : "Error desconocido",
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
 * v0.20: Rechazo por lotes (motivo unico)
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
    throw new Error("Solo el Administrador puede rechazar solicitudes de archivo");
  }
  if (!input.archiveIds.length) throw new Error("No seleccionaste ninguna solicitud");
  if (input.archiveIds.length > 100) throw new Error("Maximo 100 solicitudes por lote");
  if (!input.note.trim()) throw new Error("Ingresa el motivo del rechazo");

  const succeeded: string[] = [];
  const failed: { id: string; error: string }[] = [];
  for (const id of input.archiveIds) {
    try {
      await rejectArchiveRecord({ archiveId: id, note: input.note });
      succeeded.push(id);
    } catch (err) {
      failed.push({
        id,
        error: err instanceof Error ? err.message : "Error desconocido",
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