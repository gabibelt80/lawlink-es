"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";

const userRoleSchema = z.enum([
  "SYSTEM_ADMIN",
  "ADMIN",
  "PRINCIPAL_LAWYER",
  "LAWYER",
  "ASSISTANT",
  "FINANCE"
]);

const userCreateSchema = z.object({
  name: z.string().min(1, "Nombre y apellido obligatorio").max(40),
  email: z.string().email("Email invalido"),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres").max(128),
  role: userRoleSchema,
  phone: z.string().max(30).optional().or(z.literal(""))
});

const userUpdateRoleSchema = z.object({
  id: z.string().cuid(),
  role: userRoleSchema
});

const resetPasswordSchema = z.object({
  id: z.string().cuid(),
  newPassword: z.string().min(8).max(128)
});

const changeMyPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128)
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateRoleInput = z.infer<typeof userUpdateRoleSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangeMyPasswordInput = z.infer<typeof changeMyPasswordSchema>;

function newCalendarToken() {
  return randomBytes(24).toString("base64url");
}

async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("Solo el administrador puede ejecutar esta accion");
  }
  return session;
}

export async function listUsers() {
  const prisma = await getTenantPrisma();
  await requireAdmin();
  return prisma.user.findMany({
    orderBy: [{ active: "desc" }, { role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
      _count: { select: { ownedMatters: true, memberships: true } }
    }
  });
}

export async function listActiveColleagues() {
  const prisma = await getTenantPrisma();
  await requireSession();
  return prisma.user.findMany({
    where: { active: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true }
  });
}

export async function createUser(input: UserCreateInput) {
  const prisma = await getTenantPrisma();
  const session = await requireAdmin();
  const data = userCreateSchema.parse(input);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("El email ya esta en uso");

  // Verificar que el email no exista en la base central tampoco
  const { prisma: centralPrisma } = await import("@/lib/prisma");
  const existingFirmUser = await centralPrisma.firmUser.findUnique({
    where: { email: data.email },
  });
  if (existingFirmUser) throw new Error("El email ya esta en uso");

  const passwordHash = await bcrypt.hash(data.password, 12);
  const calendarToken = newCalendarToken();

  // 1. Crear User en el tenant
  const created = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      phone: data.phone || null,
      active: true,
      calendarToken
    }
  });

  // 2. Crear FirmUser en la base central con el mismo ID
  const firmSlug = (session.user as { firmSlug?: string }).firmSlug;
  if (!firmSlug) throw new Error("No se encontró el estudio del usuario");

  const firm = await centralPrisma.firm.findUnique({
    where: { slug: firmSlug },
    select: { id: true },
  });
  if (!firm) throw new Error("Estudio no encontrado");

  await centralPrisma.firmUser.create({
    data: {
      id: created.id, // MISMO ID para que el calendario funcione
      name: data.name,
      email: data.email,
      passwordHash,
      phone: data.phone || null,
      active: true,
      firmId: firm.id,
    },
  });

  await audit({
    userId: session.user.id,
    action: "USER_CREATE",
    targetType: "User",
    targetId: created.id,
    detail: { email: created.email, role: created.role }
  });

  revalidatePath("/settings/users");
  return { ok: true, id: created.id };
}

export async function updateUserRole(input: UserUpdateRoleInput) {
  const prisma = await getTenantPrisma();
  const session = await requireAdmin();
  const data = userUpdateRoleSchema.parse(input);
  if (data.id === session.user.id) {
    throw new Error("No podes modificar tu propio rol");
  }

  await prisma.user.update({
    where: { id: data.id },
    data: { role: data.role }
  });

  await audit({
    userId: session.user.id,
    action: "USER_ROLE_UPDATE",
    targetType: "User",
    targetId: data.id,
    detail: { role: data.role }
  });

  revalidatePath("/settings/users");
  return { ok: true };
}

export async function toggleUserActive(id: string) {
  const prisma = await getTenantPrisma();
  const session = await requireAdmin();
  if (id === session.user.id) {
    throw new Error("No podes deshabilitarte a vos mismo");
  }
  const current = await prisma.user.findUnique({ where: { id }, select: { active: true } });
  if (!current) throw new Error("El usuario no existe");

  await prisma.user.update({
    where: { id },
    data: { active: !current.active }
  });

  await audit({
    userId: session.user.id,
    action: current.active ? "USER_DEACTIVATE" : "USER_ACTIVATE",
    targetType: "User",
    targetId: id
  });

  revalidatePath("/settings/users");
  return { ok: true, active: !current.active };
}

export async function resetUserPassword(input: ResetPasswordInput) {
  const prisma = await getTenantPrisma();
  const session = await requireAdmin();
  const data = resetPasswordSchema.parse(input);

  const passwordHash = await bcrypt.hash(data.newPassword, 12);
  await prisma.user.update({
    where: { id: data.id },
    data: { passwordHash }
  });

  await audit({
    userId: session.user.id,
    action: "USER_PASSWORD_RESET",
    targetType: "User",
    targetId: data.id
  });

  return { ok: true };
}

export async function changeMyPassword(input: ChangeMyPasswordInput) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const data = changeMyPasswordSchema.parse(input);

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true }
  });
  if (!me) throw new Error("El usuario no existe");

  const matches = await bcrypt.compare(data.currentPassword, me.passwordHash);
  if (!matches) throw new Error("La contrasena actual es incorrecta");

  const passwordHash = await bcrypt.hash(data.newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash }
  });

  await audit({
    userId: session.user.id,
    action: "USER_PASSWORD_CHANGE_SELF",
    targetType: "User",
    targetId: session.user.id
  });

  return { ok: true };
}

const AVATAR_MAX_CHARS = 256 * 1024;
export async function saveMyAvatar(input: { avatar: string | null }) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  let avatar = input.avatar;
  if (typeof avatar === "string" && avatar.length > 0) {
    if (!/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/.test(avatar)) {
      throw new Error("El avatar debe ser una imagen PNG / JPG / WebP / SVG");
    }
    if (avatar.length > AVATAR_MAX_CHARS) {
      throw new Error("El avatar es demasiado grande, maximo 180KB");
    }
  } else {
    avatar = null;
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatar }
  });

  await audit({
    userId: session.user.id,
    action: "USER_AVATAR_UPDATE",
    targetType: "User",
    targetId: session.user.id
  });

  revalidatePath("/", "layout");
  return { ok: true };
}