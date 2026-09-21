"use server";

/**
 * v0.21: Push del informe semanal a todos los usuarios.
 *
 * Dos puntos de entrada:
 * - admin manual: pushWeeklyReportToAll (require session)
 * - cron automatico (v0.22): runWeeklyReportPush (sin auth, trigger=cron)
 *
 * Destinatarios: todos los ADMIN / PRINCIPAL_LAWYER / LAWYER activos.
 * Cada uno recibe su propio LawyerWeeklyDigest como Notification (type=SYSTEM).
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
 * Logica central, puede ser llamada por server action o cron.
 * triggerUserId: server action pasa el admin id; cron pasa null.
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
        title: `Informe semanal (${period.label})`,
        content: formatWeeklyDigestContent(digest),
        href: "/reports?period=month",
        refType: "WeeklyReport",
        refId: period.label
      });
      succeeded++;
    } catch (err) {
      failed.push({
        userId: u.id,
        error: err instanceof Error ? err.message : "Error desconocido"
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
    throw new Error("Solo Administrador / Abogado principal puede enviar el informe semanal");
  }
  return runWeeklyReportPush(session.user.id);
}