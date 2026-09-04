"use server";

import { z } from "zod";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { assertCanAccessMatter } from "@/lib/permissions";

const procedureIdSchema = z.object({ procedureId: z.string().cuid() });

/**
 * v0.49: Lista reglas de plazos legales aplicables al procedimiento indicado
 * (filtrado por tipo de procedimiento + categoria del Caso).
 */
export async function listDeadlineRulesForProcedure(input: { procedureId: string }) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const { procedureId } = procedureIdSchema.parse(input);

  const procedure = await prisma.matterProcedure.findUnique({
    where: { id: procedureId },
    select: {
      type: true,
      matterId: true,
      matter: { select: { category: true } }
    }
  });
  if (!procedure) throw new Error("El procedimiento no existe");
  await assertCanAccessMatter(session.user.id, session.user.role, procedure.matterId);

  return prisma.deadlineRule.findMany({
    where: {
      enabled: true,
      AND: [
        {
          OR: [
            { applicableProcedures: { isEmpty: true } },
            { applicableProcedures: { array_contains: procedure.type } }
          ]
        },
        {
          OR: [
            { applicableCategories: { equals: [] } },
            { applicableCategories: { array_contains: procedure.matter.category } }
          ]
        }
      ]
    },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      triggerLabel: true,
      periodValue: true,
      periodUnit: true,
      category: true,
      legalBasis: true,
      legalBasisUrl: true,
      verifiedAt: true,
      remindDays: true
    }
  });
}