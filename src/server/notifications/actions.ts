"use server";

import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";

export async function getNotifications(params?: { unreadOnly?: boolean; limit?: number }) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const limit = params?.limit ?? 30;

  return prisma.notification.findMany({
    where: {
      userId: session.user.id,
      ...(params?.unreadOnly ? { read: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUnreadCount() {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  return prisma.notification.count({
    where: { userId: session.user.id, read: false },
  });
}

export async function markNotificationRead(id: string) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const notif = await prisma.notification.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!notif) throw new Error("La notificacion no existe");

  return prisma.notification.update({
    where: { id },
    data: { read: true, readAt: new Date() },
  });
}

export async function markAllNotificationsRead() {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true, readAt: new Date() },
  });
  return { ok: true };
}
export async function toggleNotificationRead(id: string) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const notif = await prisma.notification.findFirst({
    where: { id, userId: session.user.id },
    select: { read: true },
  });
  if (!notif) throw new Error("La notificacion no existe");

  return prisma.notification.update({
    where: { id },
    data: { read: !notif.read, readAt: notif.read ? null : new Date() },
  });
}

export async function deleteNotification(id: string) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const notif = await prisma.notification.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!notif) throw new Error("La notificacion no existe");

  await prisma.notification.delete({ where: { id } });
  return { ok: true };
}

