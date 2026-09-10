"use server";

import bcrypt from "bcryptjs";
import { prisma, createTenantSchema, migrateTenantSchema } from "@/lib/tenant";
import { getTenantPrismaSync } from "@/lib/tenant-prisma";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

const TRIAL_DAYS = 14;

export async function registerFirm(input: {
  firmName: string;
  firmEmail: string;
  userName: string;
  userEmail: string;
  password: string;
}) {
  // Validaciones
  if (!input.firmName?.trim()) throw new Error("El nombre del estudio es obligatorio");
  if (!input.firmEmail?.trim()) throw new Error("El email del estudio es obligatorio");
  if (!input.userName?.trim()) throw new Error("Tu nombre es obligatorio");
  if (!input.userEmail?.trim()) throw new Error("Tu email es obligatorio");
  if (!input.password || input.password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres");
  }

  const slug = slugify(input.firmName);
  if (!slug) throw new Error("El nombre del estudio no es válido");

  // Verificar que no exista el slug ni los emails
  const [existingFirm, existingFirmUser] = await Promise.all([
    prisma.firm.findUnique({ where: { slug } }),
    prisma.firmUser.findUnique({ where: { email: input.userEmail } }),
  ]);

  if (existingFirm) {
    throw new Error("Ya existe un estudio con ese nombre");
  }
  if (existingFirmUser) {
    throw new Error("Ya existe un usuario con ese email");
  }

  // 1. Crear el schema del estudio
  await createTenantSchema(slug);

  // 2. Migrar el schema (crea tablas + sincroniza enums)
  await migrateTenantSchema(slug);

  // 3. Crear el estudio en el schema central
  const passwordHash = await bcrypt.hash(input.password, 12);
  const now = new Date();
  const trialExpiresAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const firm = await prisma.firm.create({
    data: {
      name: input.firmName.trim(),
      slug,
      email: input.firmEmail.trim(),
      plan: "trial",
      planExpiresAt: trialExpiresAt,
      maxUsers: 1, // trial: 1 usuario
      maxBranch: 1,
      active: true,
      subscriptionStatus: "active",
      subscriptionPeriodStart: now,
      subscriptionPeriodEnd: trialExpiresAt,
      users: {
        create: {
          name: input.userName.trim(),
          email: input.userEmail.trim(),
          passwordHash,
        },
      },
    },
    include: { users: true },
  });

  const firmUser = firm.users[0];

  // 4. Crear el usuario ADMIN en el schema del tenant
  const tenantPrisma = getTenantPrismaSync(slug);
  await tenantPrisma.user.create({
    data: {
      id: firmUser.id,
      name: input.userName.trim(),
      email: input.userEmail.trim(),
      passwordHash,
      role: "ADMIN",
      active: true,
    },
  });

  // 5. Crear SystemSetting inicial (perfil del estudio)
  await tenantPrisma.systemSetting.create({
    data: {
      key: "firmProfile",
      value: {
        firmName: input.firmName.trim(),
        firmEmail: input.firmEmail.trim(),
        firmSubtitle: "",
        firmShortName: input.firmName.trim().charAt(0).toUpperCase(),
        caseNoTemplate: "{año}-{est}{palabraCat}-{sec3}",
        categoryWords: {
          CIVIL_COMMERCIAL: "Civil",
          LABOR_ARBITRATION: "Laboral",
          COMMERCIAL_ARBITRATION: "Comercial",
          CRIMINAL: "Penal",
          ADMINISTRATIVE: "Admin",
          ADMINISTRATIVE_CLAIM: "RecAdmin",
          NON_LITIGATION: "NoCont",
          LEGAL_COUNSEL: "Consul",
          SPECIAL_PROJECT: "Proyecto",
        },
        logoDataUrl: null,
      },
    },
  });

  return { firmId: firm.id, slug, trialExpiresAt };
}
