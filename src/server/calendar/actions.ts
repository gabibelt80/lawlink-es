"use server";

import { randomBytes } from "node:crypto";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";

function newToken() {
  return randomBytes(24).toString("base64url");
}

async function resolveTenantUserId(email: string, prisma: any): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });
  return user?.id ?? null;
}

/**
 * v0.50: Obtiene (o genera) el token de suscripción al calendario del usuario actual.
 */
export async function getCalendarToken() {
  const session = await requireSession();
  const prisma = await getTenantPrisma();

  const tenantUserId = await resolveTenantUserId(session.user.email, prisma);
  if (!tenantUserId) throw new Error("Usuario no encontrado");

  const user = await prisma.user.findUnique({
    where: { id: tenantUserId },
    select: { calendarToken: true }
  });
  if (user?.calendarToken) return { token: user.calendarToken };

  const token = newToken();
  await prisma.user.update({
    where: { id: tenantUserId },
    data: { calendarToken: token }
  });
  await audit({
    userId: tenantUserId,
    action: "CALENDAR_TOKEN_CREATE",
    targetType: "User",
    targetId: tenantUserId
  });
  return { token };
}

export async function regenerateCalendarToken() {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  const tenantUserId = await resolveTenantUserId(session.user.email, prisma);
  if (!tenantUserId) throw new Error("Usuario no encontrado");

  const token = newToken();
  await prisma.user.update({
    where: { id: tenantUserId },
    data: { calendarToken: token }
  });
  await audit({
    userId: tenantUserId,
    action: "CALENDAR_TOKEN_REGENERATE",
    targetType: "User",
    targetId: tenantUserId
  });
  return { token };
}