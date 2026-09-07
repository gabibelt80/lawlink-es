"use server";

import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const planModulesSchema = z.object({
  plans: z.record(z.array(z.string())),
});

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