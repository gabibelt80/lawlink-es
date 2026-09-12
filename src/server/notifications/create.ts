// Helper interno: solo lo llaman server actions / cron. No lleva "use server"
// porque cualquier cliente podría invocarlo para crear notificaciones a usuarios arbitrarios.
import { getTenantPrisma } from "@/lib/tenant-prisma";
import type { NotificationPriority, NotificationType } from "@prisma/client";

type CreateNotificationInput = {
  userId: string;
  type: string;
  priority?: string;
  title: string;
  content?: string;
  href?: string;
  refType?: string;
  refId?: string;
};

/** Helper generico para crear notificaciones, llamado por otras server actions. */
export async function createNotification(input: CreateNotificationInput) {
  const prisma = await getTenantPrisma();
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type as NotificationType,
      priority: (input.priority ?? "NORMAL") as NotificationPriority,
      title: input.title,
      content: input.content,
      href: input.href,
      refType: input.refType,
      refId: input.refId,
    },
  });
}