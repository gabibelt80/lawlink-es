"use server";

import bcrypt from "bcryptjs";
import { getTenantPrismaSync } from "@/lib/tenant-prisma";
import { prisma, createTenantSchema, migrateTenantSchema, dropTenantSchema } from "@/lib/tenant";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export async function createFirmAction(input: {
  firmName: string;
  firmEmail: string;
  userName: string;
  userEmail: string;
  password: string;
}) {
  const slug = slugify(input.firmName);

  const existing = await prisma.firm.findUnique({ where: { slug } });
  if (existing) {
    throw new Error("Ya existe un estudio con ese nombre");
  }

  // 1. Crear schema
  await createTenantSchema(slug);

  // 2. Migrar schema
  await migrateTenantSchema(slug);

  // 3. Crear estudio en base central
  const passwordHash = await bcrypt.hash(input.password, 12);
  const firm = await prisma.firm.create({
    data: {
      name: input.firmName,
      slug,
      email: input.firmEmail,
      plan: "trial",
      planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias de trial
      maxUsers: 5,
      maxBranch: 1,
      users: {
        create: {
          name: input.userName,
          email: input.userEmail,
          passwordHash,
        },
      },
    },
    include: { users: true },
  });

  // 4. Crear usuario en el tenant schema
  const tenantPrisma = getTenantPrismaSync(slug);
  await tenantPrisma.user.create({
    data: {
      id: firm.users[0].id,
      name: input.userName,
      email: input.userEmail,
      passwordHash,
      role: "ADMIN",
    },
  });

  // 5. Crear datos iniciales del tenant (opcional, como SystemSetting)
  await tenantPrisma.systemSetting.create({
    data: {
      key: "firmProfile",
      value: { firmName: input.firmName, firmEmail: input.firmEmail },
    },
  });

  return { ok: true, slug };
}

export async function toggleFirmActiveAction({ firmId }: { firmId: string }) {
  const firm = await prisma.firm.findUnique({ where: { id: firmId } });
  if (!firm) throw new Error("Estudio no encontrado");

  await prisma.firm.update({
    where: { id: firmId },
    data: { active: !firm.active },
  });

  return { ok: true, active: !firm.active };
}

export async function deleteFirmAction({ firmId }: { firmId: string }) {
  const firm = await prisma.firm.findUnique({ where: { id: firmId } });
  if (!firm) throw new Error("Estudio no encontrado");

  // Eliminar schema
  await dropTenantSchema(firm.slug);

  // Eliminar estudio y usuarios
  await prisma.firm.delete({ where: { id: firmId } });

  return { ok: true };
}
export async function updateFirmPlanAction({ firmId, plan }: { firmId: string; plan: string }) {
  const { activatePlan } = await import("@/lib/plan-limits");
  await activatePlan(firmId, plan);
  return { ok: true };
}

