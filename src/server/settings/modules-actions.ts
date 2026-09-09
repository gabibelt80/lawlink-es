"use server";

import { requireSession } from "@/lib/auth/session";
import { getPlanModules, PLAN_MODULES, MODULES, ModuleKey } from "@/lib/modules";
import { prisma } from "@/lib/prisma";

export async function getModulesForCurrentFirm(): Promise<ModuleKey[]> {
  const session = await requireSession();
  
  if (session.user.role === "SYSTEM_ADMIN") {
    return Object.keys(MODULES) as ModuleKey[];
  }

  const firmUser = await prisma.firmUser.findUnique({
    where: { email: session.user.email ?? "" },
    include: { firm: true },
  });

  if (!firmUser?.firm) return PLAN_MODULES.trial;

  // 1. Primero intentamos leer de systemSetting (BD) - configurado por super admin
  try {
    const row = await prisma.systemSetting.findUnique({
      where: { key: "planModules" },
    });

    if (row?.value && typeof row.value === "object") {
      const modulesMap = row.value as Record<string, string[]>;
      const planModules = modulesMap[firmUser.firm.plan];
      
      if (Array.isArray(planModules) && planModules.length > 0) {
        // Filtrar solo módulos válidos
        const validModules = planModules.filter((m): m is ModuleKey => 
          Object.keys(MODULES).includes(m)
        );
        return validModules;
      }
    }
  } catch (error) {
    console.error("Error leyendo planModules de systemSetting:", error);
  }

  // 2. Fallback: usar PLAN_MODULES del código
  return getPlanModules(firmUser.firm.plan);
}
