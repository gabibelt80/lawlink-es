"use server";

import { requireSession } from "@/lib/auth/session";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { getPlanModules, PLAN_MODULES, MODULES, ModuleKey } from "@/lib/modules";

export async function getModulesForCurrentFirm(): Promise<ModuleKey[]> {
  const session = await requireSession();
  
  // System admin ve todos los módulos
  if (session.user.role === "SYSTEM_ADMIN") {
    return Object.keys(MODULES) as ModuleKey[];
  }

  const prisma = await getTenantPrisma();
  const firmUser = await prisma.firmUser.findUnique({
    where: { email: session.user.email },
    include: { firm: true },
  });

  if (!firmUser?.firm) return PLAN_MODULES.trial;

  return getPlanModules(firmUser.firm.plan);
}