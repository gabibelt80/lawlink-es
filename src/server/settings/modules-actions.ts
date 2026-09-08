"use server";

import { requireSession } from "@/lib/auth/session";
import { getPlanModules, PLAN_MODULES, MODULES, ModuleKey } from "@/lib/modules";

export async function getModulesForCurrentFirm(): Promise<ModuleKey[]> {
  const session = await requireSession();
  
  if (session.user.role === "SYSTEM_ADMIN") {
    return Object.keys(MODULES) as ModuleKey[];
  }

  const { centralPrisma } = await import("@/lib/tenant-prisma");
  const firmUser = await centralPrisma.firmUser.findUnique({
    where: { email: session.user.email ?? "" },
    include: { firm: true },
  });

  if (!firmUser?.firm) return PLAN_MODULES.trial;

  return getPlanModules(firmUser.firm.plan);
}
