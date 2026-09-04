"use server";

import { z } from "zod";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { assertCanAccessMatter } from "@/lib/permissions";

const procedureIdSchema = z.object({ procedureId: z.string().cuid() });

/**
 * v0.49ï¼šåˆ—å‡ºé€‚ç”¨äºŽæŒ‡å®šç¨‹åºçš„æ³•å®šPlazoè§„åˆ™ï¼ˆæŒ‰ç¨‹åºç±»åž‹ + Casoç±»åˆ«è¿‡æ»¤ï¼‰ã€‚
 * ç”ŸæˆPlazoæœ¬èº«ä»èµ° addDeadlineï¼ˆå•ä¸€Enviarè·¯å¾„ï¼Œæƒé™æ ¡éªŒä¸é‡å¤å®žçŽ°ï¼‰ã€‚
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
  if (!procedure) throw new Error("ç¨‹åºä¸å­˜åœ¨");
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


