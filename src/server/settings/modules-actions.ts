"use server";

import { requireSession } from "@/lib/auth/session";
import { PLAN_MODULES, MODULES, ModuleKey } from "@/lib/modules";
import { prisma } from "@/lib/prisma";

/**
 * Devuelve los módulos activos para el estudio del usuario en sesión.
 *
 * Orden de precedencia:
 *  1. Módulos premium contratados y activos (FirmModuleSubscription).
 *  2. Módulos base activados para el estudio (Firm.enabledBaseModules).
 *  3. Fallback: módulos del plan (PLAN_MODULES).
 *
 * Si los puntos 1 y 2 no aportan nada (estudio sin configuración),
 * se devuelven los módulos del plan.
 */
export async function getModulesForCurrentFirm(): Promise<ModuleKey[]> {
  const session = await requireSession();

  if (session.user.role === "SYSTEM_ADMIN") {
    return Object.keys(MODULES) as ModuleKey[];
  }

  const firmUser = await prisma.firmUser.findUnique({
    where: { email: session.user.email ?? "" },
    include: {
      firm: {
        include: {
          moduleSubscriptions: {
            where: { active: true, status: { in: ["active", "past_due"] } },
            select: { moduleKey: true },
          },
        },
      },
    },
  });

  if (!firmUser?.firm) return PLAN_MODULES.trial;

  const firm = firmUser.firm;
  const validKeys = Object.keys(MODULES) as ModuleKey[];
  const isValid = (k: string): k is ModuleKey => validKeys.includes(k as ModuleKey);

  // 1. Módulos premium activos
  const premiumActive = firm.moduleSubscriptions
    .map((s) => s.moduleKey)
    .filter(isValid);

  // 2. Módulos base habilitados por el super admin
  const baseEnabled = Array.isArray(firm.enabledBaseModules)
    ? (firm.enabledBaseModules as string[]).filter(isValid)
    : [];

  // Si hay configuración real (base o premium), usarla.
  if (baseEnabled.length > 0 || premiumActive.length > 0) {
    const combined = new Set<ModuleKey>([...baseEnabled, ...premiumActive]);
    return Array.from(combined);
  }

  // 3. Fallback: módulos del plan (estudios sin configuración)
  const planModules = PLAN_MODULES[firm.plan] ?? PLAN_MODULES.trial;
  return planModules;
}
/**
 * Devuelve true si el módulo está activo para el estudio del usuario en sesión.
 * Atajo liviano de getModulesForCurrentFirm para consultar un solo módulo.
 */
export async function getModuleEnabled(module: ModuleKey): Promise<boolean> {
  const mods = await getModulesForCurrentFirm();
  return mods.includes(module);
}