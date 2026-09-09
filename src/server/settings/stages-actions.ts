"use server";

import { requireSession } from "@/lib/auth/session";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { revalidatePath } from "next/cache";

/**
 * Verifica si una etapa tiene archivos asociados en casos existentes
 * Si tiene, no se puede eliminar, solo ocultar
 */
export async function checkStageDeletionAction(input: {
  procedureType: string;
  stageName: string;
}) {
  const session = await requireSession();
  if (!session.user.email) throw new Error("No autenticado");

  const prisma = await getTenantPrisma();

  const stagesWithDocuments = await prisma.matterStage.findMany({
    where: {
      name: input.stageName,
      OR: [
        { documents: { some: { deletedAt: null } } },
        { tasks: { some: {} } },
      ],
    },
    select: {
      id: true,
      name: true,
      procedure: {
        select: {
          matter: {
            select: { internalCode: true, title: true },
          },
        },
      },
      _count: {
        select: { documents: true, tasks: true },
      },
    },
  });

  if (stagesWithDocuments.length > 0) {
    return {
      canDelete: false,
      reason: `La etapa tiene ${stagesWithDocuments.length} caso(s) con archivos o tareas asociados. Podés ocultarla en lugar de eliminarla.`,
      affectedCases: stagesWithDocuments.map((s) => ({
        stageId: s.id,
        matterCode: s.procedure.matter.internalCode,
        matterTitle: s.procedure.matter.title,
        documents: s._count.documents,
        tasks: s._count.tasks,
      })),
    };
  }

  return { canDelete: true };
}

/**
 * Oculta una etapa (en lugar de eliminar) cuando tiene archivos
 */
export async function hideStageAction(input: {
  procedureType: string;
  stageName: string;
}) {
  const session = await requireSession();
  if (!session.user.email) throw new Error("No autenticado");

  const prisma = await getTenantPrisma();

  await prisma.matterStage.updateMany({
    where: {
      name: input.stageName,
      status: "ACTIVE",
    },
    data: {
      status: "HIDDEN",
    },
  });

  revalidatePath("/settings/stages");
  return { ok: true };
}

export async function saveStagesAction(input: {
  procedureType: string;
  stages: { name: string; kind: "required" | "optional"; description: string }[];
}) {
  const session = await requireSession();
  if (!session.user.email) throw new Error("No autenticado");

  const prisma = await getTenantPrisma();

  await prisma.stageTemplate.upsert({
    where: { id: `custom_${input.procedureType}` },
    update: {
      name: `Etapas de ${input.procedureType}`,
      steps: input.stages,
    },
    create: {
      id: `custom_${input.procedureType}`,
      procedureType: input.procedureType as any,
      name: `Etapas de ${input.procedureType}`,
      isDefault: false,
      steps: input.stages,
    },
  });

  revalidatePath("/settings/stages");
  return { ok: true };
}
