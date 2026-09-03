"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";

const userRoleSchema = z.enum([
  "ADMIN",
  "PRINCIPAL_LAWYER",
  "LAWYER",
  "ASSISTANT",
  "FINANCE"
]);

const userCreateSchema = z.object({
  name: z.string().min(1, "Nombre y apellidoå¿…å¡«").max(40),
  email: z.string().email("Emailæ ¼å¼ä¸æ­£ç¡®"),
  password: z.string().min(8, "ContraseÃ±aè‡³å°‘ 8 ä½").max(128),
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

async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("ä»…Administrarå‘˜å¯æ‰§è¡Œ");
  }
  return session;
}

export async function listUsers() {
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

/**
 * ä»»æ„Iniciar sesiÃ³nç”¨æˆ·éƒ½å¯è°ƒï¼šæ‹¿æ´»è·ƒåŒäº‹åˆ—è¡¨ï¼Œç”¨äºŽæ”¶æ¡ˆ/Casoå›¢é˜Ÿé€‰æ‹©ã€‚
 * é»˜è®¤æŽ’é™¤ FINANCE/ADMIN SistemaRolï¼ˆä»å¯é€‰ï¼Œåš"Ver todos"åˆ‡æ¢æ—¶å†å¼€æ”¾ï¼‰ã€‚
 */
export async function listActiveColleagues() {
  await requireSession();
  return prisma.user.findMany({
    where: { active: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true }
  });
}

export async function createUser(input: UserCreateInput) {
  const session = await requireAdmin();
  const data = userCreateSchema.parse(input);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("Emailå·²è¢«ä½¿ç”¨");

  const passwordHash = await bcrypt.hash(data.password, 12);
  const created = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      phone: data.phone || null,
      active: true
    }
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
  const session = await requireAdmin();
  const data = userUpdateRoleSchema.parse(input);
  if (data.id === session.user.id) {
    throw new Error("ä¸èƒ½ä¿®æ”¹è‡ªå·±çš„Rol");
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
    throw new Error("ä¸èƒ½Deshabilitarè‡ªå·±");
  }
  const current = await prisma.user.findUnique({ where: { id }, select: { active: true } });
  if (!current) throw new Error("ç”¨æˆ·ä¸å­˜åœ¨");

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

/**
 * å½“å‰ç”¨æˆ·æ”¹è‡ªå·±çš„ContraseÃ±aï¼ˆä»»ä½•Rolå¯ç”¨ï¼‰ã€‚
 */
export async function changeMyPassword(input: ChangeMyPasswordInput) {
  const session = await requireSession();
  const data = changeMyPasswordSchema.parse(input);

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true }
  });
  if (!me) throw new Error("ç”¨æˆ·ä¸å­˜åœ¨");

  const matches = await bcrypt.compare(data.currentPassword, me.passwordHash);
  if (!matches) throw new Error("å½“å‰ContraseÃ±aä¸æ­£ç¡®");

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

/** v0.43ï¼šGuardar / æ¸…é™¤ä¸ªäººå¤´åƒï¼ˆbase64 data URL å†…è”å­˜ User.avatarï¼Œçº¦ 256KB ä¸Šé™ï¼‰ */
const AVATAR_MAX_CHARS = 256 * 1024;
export async function saveMyAvatar(input: { avatar: string | null }) {
  const session = await requireSession();
  let avatar = input.avatar;
  if (typeof avatar === "string" && avatar.length > 0) {
    if (!/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/.test(avatar)) {
      throw new Error("å¤´åƒå¿…é¡»æ˜¯ PNG / JPG / WebP / SVG å›¾ç‰‡");
    }
    if (avatar.length > AVATAR_MAX_CHARS) {
      throw new Error("å¤´åƒä½“ç§¯è¿‡å¤§ï¼Œè¯·æŽ§åˆ¶åœ¨çº¦ 180KB ä»¥å†…");
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


