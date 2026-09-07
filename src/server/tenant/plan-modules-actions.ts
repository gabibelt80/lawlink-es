"use server";

import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

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