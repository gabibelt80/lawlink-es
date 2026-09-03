// å†…éƒ¨ helperï¼šä»…ä¾› server action / cron è°ƒç”¨ï¼Œä¸åšé‰´æƒã€‚
// ä¸èƒ½æ ‡ "use server"ï¼Œå¦åˆ™ä»»ä½•Clienteç«¯å¯ç›´æŽ¥è°ƒç”¨ç»™ä»»æ„ç”¨æˆ·ä¼ªé€ Notificacionesã€‚
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

/** é€šç”¨NotificacionesCrear helperï¼Œè¢«å…¶ä»– server action è°ƒç”¨ */
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


