"use server";

import bcrypt from "bcryptjs";
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

  // 3. Crear estudio
  const passwordHash = await bcrypt.hash(input.password, 12);
  await prisma.firm.create({
    data: {
      name: input.firmName,
      slug,
      email: input.firmEmail,
      users: {
        create: {
          name: input.userName,
          email: input.userEmail,
          passwordHash,
        },
      },
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