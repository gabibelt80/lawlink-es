"use server";

/**
 * v0.21: æŽ¨é€æœ¬å‘¨Informeç»™å…¨å‘˜
 *
 * ä¸¤ä¸ªå…¥å£ï¼š
 * - admin æ‰‹åŠ¨ï¼špushWeeklyReportToAllï¼ˆrequire sessionï¼‰
 * - cron è‡ªåŠ¨ï¼ˆv0.22ï¼‰ï¼šrunWeeklyReportPushï¼ˆæ—  authï¼Œtrigger=cronï¼‰
 *
 * Recibidoäººï¼šæ‰€æœ‰ active çš„ ADMIN / PRINCIPAL_LAWYER / LAWYERã€‚
 * æ¯äººæ”¶åˆ°è‡ªå·±çš„ LawyerWeeklyDigest æ‘˜è¦ï¼Œä½œä¸º Notificationï¼ˆtype=SYSTEMï¼‰ã€‚
 */
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { createNotification } from "@/server/notifications/create";
import {
  weekPeriod,
  getLawyerWeeklyDigest,
  formatWeeklyDigestContent
} from "./weekly";

export type WeeklyPushResult = {
  succeeded: number;
  failed: { userId: string; error: string }[];
  weekLabel: string;
};

/**
 * æ ¸å¿ƒé€»è¾‘ï¼Œå¯è¢« server action æˆ– cron è°ƒç”¨ã€‚
 * triggerUserId: server action ä¼ å½“å‰ admin idï¼›cron ä¼  nullã€‚
 */
export async function runWeeklyReportPush(
  triggerUserId: string | null
): Promise<WeeklyPushResult> {
  const period = weekPeriod();
  const recipients = await prisma.user.findMany({
    where: {
      active: true,
      role: { in: ["ADMIN", "PRINCIPAL_LAWYER", "LAWYER"] }
    },
    select: { id: true, name: true }
  });

  const failed: { userId: string; error: string }[] = [];
  let succeeded = 0;
  for (const u of recipients) {
    try {
      const digest = await getLawyerWeeklyDigest({
        userId: u.id,
        userName: u.name,
        period
      });
      await createNotification({
        userId: u.id,
        type: "SYSTEM",
        priority: "NORMAL",
        title: `æœ¬å‘¨Informeï¼ˆ${period.label}ï¼‰`,
        content: formatWeeklyDigestContent(digest),
        href: "/reports?period=month",
        refType: "WeeklyReport",
        refId: period.label
      });
      succeeded++;
    } catch (err) {
      failed.push({
        userId: u.id,
        error: err instanceof Error ? err.message : "Desconocidoé”™è¯¯"
      });
    }
  }

  await audit({
    userId: triggerUserId,
    action: triggerUserId ? "WEEKLY_REPORT_PUSH" : "WEEKLY_REPORT_PUSH_CRON",
    targetType: "Report",
    targetId: period.label,
    detail: {
      weekLabel: period.label,
      total: recipients.length,
      succeeded,
      failed: failed.length,
      trigger: triggerUserId ? "manual" : "cron"
    }
  });

  return { succeeded, failed, weekLabel: period.label };
}

export async function pushWeeklyReportToAll(): Promise<WeeklyPushResult> {
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("ä»…Administrarå‘˜ / ä¸»ä»»Abogadoå¯æŽ¨é€å‘¨æŠ¥");
  }
  return runWeeklyReportPush(session.user.id);
}


