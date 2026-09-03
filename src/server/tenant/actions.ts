"use server";

import bcrypt from "bcryptjs";
import { prisma, createTenantSchema, migrateTenantSchema } from "@/lib/tenant";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export async function registerFirm(input: {
  firmName: string;
  firmEmail: string;
  userName: string;
  userEmail: string;
  password: string;
}) {
  const slug = slugify(input.firmName);

  // Verificar que no exista
  const existing = await prisma.firm.findUnique({ where: { slug } });
  if (existing) {
    throw new Error("Ya existe un estudio con ese nombre");
  }

  // 1. Crear el schema del estudio
  await createTenantSchema(slug);

  // 2. Migrar el schema
  await migrateTenantSchema(slug);

  // 3. Crear el estudio en el schema central
  const passwordHash = await bcrypt.hash(input.password, 12);
  const firm = await prisma.firm.create({
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
    include: { users: true },
  });

  return { firmId: firm.id, slug };
}

