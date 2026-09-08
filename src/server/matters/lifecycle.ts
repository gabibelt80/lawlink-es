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
  summary: z.string().min(1, "El resumen de cierre es obligatorio").max(2000)
});

const holdMatterSchema = z.object({
  id: z.string().cuid(),
  reason: z.string().max(500).optional().or(z.literal(""))
});

export type CloseMatterInput = z.infer<typeof closeMatterSchema>;
export type HoldMatterInput = z.infer<typeof holdMatterSchema>;

/**
 * Cerrar caso: cambia el estado del caso a CLOSED, registra el resumen en TimelineEvent.
 */
export async function closeMatter(input: CloseMatterInput) {
  const session = await requireSession();
  const data = closeMatterSchema.parse(input);
  await assertMatterWritable(data.id);
  await assertCanLeadMatter(session.user.id, session.user.role as any, data.id, "Solo el responsable/co-responsable puede cerrar el caso");

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
        title: "Caso cerrado",
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
 * Archivo: flujo completo en src/server/archive/actions.ts → archiveMatter
 */

/**
 * Reabrir caso (de ON_HOLD / CLOSED a IN_PROGRESS).
 * ARCHIVED no se puede reabrir.
 */
export async function reopenMatter(id: string) {
  const session = await requireSession();
  const matter = await prisma.matter.findUnique({ where: { id }, select: { status: true } });
  if (!matter) throw new Error("Caso no existe");
  await assertMatterWritable(id);
  await assertCanLeadMatter(session.user.id, session.user.role as any, id, "Solo el responsable/co-responsable puede reabrir el caso");
  if (matter.status === "ARCHIVED") {
    throw new Error("Caso archivado no se puede reabrir");
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
        title: "Caso reabierto",
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
 * Pausar caso (cliente no responde, falta material, etc.).
 */
export async function holdMatter(input: HoldMatterInput) {
  const session = await requireSession();
  const data = holdMatterSchema.parse(input);
  await assertMatterWritable(data.id);
  await assertCanLeadMatter(session.user.id, session.user.role as any, data.id, "Solo el responsable/co-responsable puede pausar el caso");

  await prisma.$transaction(async (tx) => {
    await tx.matter.update({
      where: { id: data.id },
      data: { status: "ON_HOLD" }
    });
    await tx.timelineEvent.create({
      data: {
        matterId: data.id,
        eventType: "MATTER_ON_HOLD",
        title: "Caso pausado",
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