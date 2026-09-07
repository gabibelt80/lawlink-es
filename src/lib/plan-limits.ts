import { prisma } from "@/lib/prisma";
import { getPlan } from "@/lib/plans";
import { getSession } from "@/lib/auth/session";

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
export async function getPlanLimitsForCurrentFirm() {
  const session = await getSession();
  if (!session?.user?.email) return { storageGB: 1 };
  
  const firmUser = await prisma.firmUser.findUnique({
    where: { email: session.user.email },
    include: { firm: true },
  });
  
  if (!firmUser?.firm) return { storageGB: 1 };
  
  // Leer límites personalizados
  const row = await prisma.systemSetting.findUnique({
    where: { key: "planLimits" },
  });
  
  if (row?.value && typeof row.value === "object") {
    const limits = row.value as Record<string, any>;
    const planLimits = limits[firmUser.firm.plan];
    if (planLimits?.storageGB) {
      return { storageGB: planLimits.storageGB };
    }
  }
  
  // Valores por defecto
  const defaults: Record<string, number> = {
    trial: 3,
    basic: 5,
    professional: 10,
    studio: 30,
  };
  
  return { storageGB: defaults[firmUser.firm.plan] ?? 1 };
}
