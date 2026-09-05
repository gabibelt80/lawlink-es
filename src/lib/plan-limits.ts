import { prisma } from "@/lib/prisma";
import { getPlan } from "@/lib/plans";

/**
 * Verifica si el estudio puede crear un nuevo usuario.
 */
export async function canCreateUser(firmId: string): Promise<boolean> {
  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
    include: { _count: { select: { users: true } } },
  });

  if (!firm) return false;
  const plan = getPlan(firm.plan);

  return firm._count.users < plan.maxUsers;
}

/**
 * Verifica si el estudio estÃ¡ activo y no expirÃ³.
 */
export async function isFirmActive(firmId: string): Promise<boolean> {
  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
  });

  if (!firm || !firm.active) return false;

  if (firm.plan === "trial" && firm.planExpiresAt) {
    return new Date() < firm.planExpiresAt;
  }

  return true;
}

/**
 * Activa un plan para un estudio.
 */
export async function activatePlan(firmId: string, planKey: string): Promise<void> {
  const plan = getPlan(planKey);
  await prisma.firm.update({
    where: { id: firmId },
    data: {
      plan: planKey,
      maxUsers: plan.maxUsers,
      maxBranch: plan.maxBranch,
      planExpiresAt: planKey === "trial" ? new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000) : null,
    },
  });
}
