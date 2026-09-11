"use server";

import { randomBytes } from "node:crypto";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";

function newToken() {
  return randomBytes(24).toString("base64url");
}

export async function getCalendarToken() {
  const prisma = await getTenantPrisma();
  const session = await requireSession();

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { calendarToken: true },
  });

  if (!user) throw new Error("Usuario no encontrado en el estudio");

  if (user.calendarToken) {
    return { token: user.calendarToken };
  }

  const token = newToken();
  await prisma.user.update({
    where: { id: userId },
    data: { calendarToken: token },
  });

  await audit({
    userId,
    action: "CALENDAR_TOKEN_CREATE",
    targetType: "User",
    targetId: userId,
  });

  return { token };
}

export async function regenerateCalendarToken() {
  const prisma = await getTenantPrisma();
  const session = await requireSession();

  const userId = session.user.id;

  const token = newToken();
  await prisma.user.update({
    where: { id: userId },
    data: { calendarToken: token },
  });

  await audit({
    userId,
    action: "CALENDAR_TOKEN_REGENERATE",
    targetType: "User",
    targetId: userId,
  });

  return { token };
}