// 内部 helper：仅供 server action / cron 调用，不做鉴权。
// 不能标 "use server"，否则任何Cliente端可直接调用给任意用户伪造Notificaciones。
import { prisma } from "@/lib/prisma";
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

/** 通用NotificacionesCrear helper，被其他 server action 调用 */
export async function createNotification(input: CreateNotificationInput) {
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
