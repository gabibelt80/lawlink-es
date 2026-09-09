"use server";

import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PLAN_MODULES, MODULES, ModuleKey } from "@/lib/modules";
import { PLANS } from "@/lib/plans";

const planModulesSchema = z.object({
  plans: z.record(z.array(z.string())),
});

const planConfigSchema = z.object({
  price: z.number(),
  maxUsers: z.number(),
  maxBranch: z.number(),
  storageGB: z.number(),
  modules: z.array(z.string()),
});

const plansSchema = z.object({
  plans: z.record(planConfigSchema),
});

export async function getPlanConfigAction() {
  const session = await requireSession();
  if (session.user.role !== "SYSTEM_ADMIN") {
    throw new Error("Solo el administrador del sistema puede configurar planes");
  }

  // Leer configuración guardada
  const [modulesRow, limitsRow] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "planModules" } }),
    prisma.systemSetting.findUnique({ where: { key: "planLimits" } }),
  ]);

  const result: Record<string, any> = {};

  // Inicializar con valores por defecto del código
  Object.keys(PLANS).forEach((planKey) => {
    result[planKey] = {
      price: PLANS[planKey as keyof typeof PLANS].price,
      maxUsers: PLANS[planKey as keyof typeof PLANS].maxUsers,
      maxBranch: PLANS[planKey as keyof typeof PLANS].maxBranch,
      storageGB: PLANS[planKey as keyof typeof PLANS].storageGB,
      modules: PLAN_MODULES[planKey] ?? [],
    };
  });

  // Sobrescribir con lo guardado en BD
  if (modulesRow?.value && typeof modulesRow.value === "object") {
    const modulesMap = modulesRow.value as Record<string, string[]>;
    Object.entries(modulesMap).forEach(([planKey, modules]) => {
      if (result[planKey] && Array.isArray(modules)) {
        result[planKey].modules = modules.filter((m) => 
          Object.keys(MODULES).includes(m)
        );
      }
    });
  }

  if (limitsRow?.value && typeof limitsRow.value === "object") {
    const limitsMap = limitsRow.value as Record<string, any>;
    Object.entries(limitsMap).forEach(([planKey, limits]) => {
      if (result[planKey] && limits && typeof limits === "object") {
        if (typeof limits.price === "number") result[planKey].price = limits.price;
        if (typeof limits.maxUsers === "number") result[planKey].maxUsers = limits.maxUsers;
        if (typeof limits.maxBranch === "number") result[planKey].maxBranch = limits.maxBranch;
        if (typeof limits.storageGB === "number") result[planKey].storageGB = limits.storageGB;
      }
    });
  }

  return { plans: result };
}

export async function savePlansConfigAction(input: z.infer<typeof plansSchema>) {
  const session = await requireSession();
  if (session.user.role !== "SYSTEM_ADMIN") {
    throw new Error("Solo el administrador del sistema puede configurar planes");
  }

  const data = plansSchema.parse(input);

  // Guardar módulos por plan
  const modulesMap: Record<string, string[]> = {};
  Object.entries(data.plans).forEach(([planKey, config]) => {
    modulesMap[planKey] = config.modules;
  });

  await prisma.systemSetting.upsert({
    where: { key: "planModules" },
    update: { value: modulesMap },
    create: { key: "planModules", value: modulesMap },
  });

  // Guardar precios y límites
  const limitsMap: Record<string, { price: number; maxUsers: number; maxBranch: number; storageGB: number }> = {};
  Object.entries(data.plans).forEach(([planKey, config]) => {
    limitsMap[planKey] = {
      price: config.price,
      maxUsers: config.maxUsers,
      maxBranch: config.maxBranch,
      storageGB: config.storageGB,
    };
  });

  await prisma.systemSetting.upsert({
    where: { key: "planLimits" },
    update: { value: limitsMap },
    create: { key: "planLimits", value: limitsMap },
  });

  return { ok: true };
}

export async function savePlanModulesAction(input: z.infer<typeof planModulesSchema>) {
  const session = await requireSession();
  if (session.user.role !== "SYSTEM_ADMIN") {
    throw new Error("Solo el administrador del sistema puede configurar planes");
  }

  const data = planModulesSchema.parse(input);

  await prisma.systemSetting.upsert({
    where: { key: "planModules" },
    update: { value: data.plans },
    create: { key: "planModules", value: data.plans },
  });

  return { ok: true };
}
