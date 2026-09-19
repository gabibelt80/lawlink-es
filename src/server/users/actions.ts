"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { getTenantPrisma, centralPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";

const userRoleSchema = z.enum([
  "ADMIN",
  "PRINCIPAL_LAWYER",
  "LAWYER",
  "ASSISTANT",
  "FINANCE"
]);

const assignableRoleSchema = z.enum([
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
  role: assignableRoleSchema,
  phone: z.string().max(30).optional().or(z.literal(""))
});

const userUpdateRoleSchema = z.object({
  id: z.string().cuid(),
  role: assignableRoleSchema,
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
  const session = await requireAdmin();

  // 1. Traer solo los usuarios que pertenecen al estudio del admin actual
  const firmUsers = await centralPrisma.firmUser.findMany({
    where: { firmId: session.user.firmId ?? undefined },
    select: { id: true },
  });
  const ids = firmUsers.map((fu) => fu.id);

  // 2. Traer los datos completos (role, counts, etc.) desde User
  const prisma = await getTenantPrisma();
  return prisma.user.findMany({
    where: {
      id: { in: ids },
      role: { not: "SYSTEM_ADMIN" },
    },
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
      _count: { select: { ownedMatters: true, memberships: true } },
    },
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
  if (!firmSlug) throw new Error("No se encontro el estudio del usuario");

  const firm = await centralPrisma.firm.findUnique({
    where: { slug: firmSlug },
    select: { id: true },
  });
  if (!firm) throw new Error("Estudio no encontrado");

  await centralPrisma.firmUser.create({
    data: {
      id: created.id,
      name: data.name,
      email: data.email,
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

  // Verificar que el usuario pertenece al estudio del admin
  const firmUser = await centralPrisma.firmUser.findUnique({
    where: { id: data.id },
    select: { firmId: true },
  });
  if (!firmUser || firmUser.firmId !== session.user.firmId) {
    throw new Error("El usuario no pertenece a tu estudio");
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
  const session = await requireAdmin();
  if (id === session.user.id) {
    throw new Error("No podes deshabilitarte a vos mismo");
  }

  // Verificar que el usuario pertenece al estudio del admin
  const firmUser = await centralPrisma.firmUser.findUnique({
    where: { id },
    select: { firmId: true, active: true, email: true },
  });
  if (!firmUser) throw new Error("El usuario no existe en este estudio");
  if (firmUser.firmId !== session.user.firmId) {
    throw new Error("El usuario no pertenece a tu estudio");
  }

  const prisma = await getTenantPrisma();
  const current = await prisma.user.findUnique({
    where: { id },
    select: { active: true, role: true },
  });
  if (!current) throw new Error("El usuario no existe");
  if (current.role === "SYSTEM_ADMIN") {
    throw new Error("No se puede deshabilitar a un administrador de plataforma");
  }

  const newActive = !current.active;

  await prisma.user.update({ where: { id }, data: { active: newActive } });
  await centralPrisma.firmUser.update({
    where: { id },
    data: { active: newActive },
  });

  await audit({
    userId: session.user.id,
    action: newActive ? "USER_ACTIVATE" : "USER_DEACTIVATE",
    targetType: "User",
    targetId: id,
  });

  revalidatePath("/settings/users");
  return { ok: true, active: newActive };
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
    select: { passwordHash: true, email: true },
  });
  if (!me) throw new Error("El usuario no existe");

  const matches = await bcrypt.compare(data.currentPassword, me.passwordHash);
  if (!matches) throw new Error("La contrasena actual es incorrecta");

  const passwordHash = await bcrypt.hash(data.newPassword, 12);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  await audit({
    userId: session.user.id,
    action: "USER_PASSWORD_CHANGE_SELF",
    targetType: "User",
    targetId: session.user.id,
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

/**
 * Guarda la firma PNG del usuario actual (data URL base64).
 * La valida: PNG only, max 500 KB.
 */
export async function saveMySignature(input: { signaturePng: string | null }) {
  const session = await requireSession();
  const prisma = await getTenantPrisma();

  const { signaturePng } = input;

  if (signaturePng !== null) {
    if (
      !/^data:image\/png;base64,/.test(signaturePng) &&
      !/^data:image\/webp;base64,/.test(signaturePng)
    ) {
      throw new Error("La firma debe ser un PNG o WebP");
    }
    // Limite 500 KB
    if (signaturePng.length > 700_000) {
      throw new Error("La firma es demasiado grande. Maximo 500 KB.");
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { signaturePng },
  });

  await audit({
    userId: session.user.id,
    action: signaturePng ? "USER_SIGNATURE_SAVE" : "USER_SIGNATURE_DELETE",
    targetType: "User",
    targetId: session.user.id,
  });

  revalidatePath("/settings/profile");
  return { ok: true };
}

/**
 * Devuelve la firma del usuario actual.
 */
export async function getMySignature(): Promise<string | null> {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  const u = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { signaturePng: true },
  });
  return u?.signaturePng ?? null;
}