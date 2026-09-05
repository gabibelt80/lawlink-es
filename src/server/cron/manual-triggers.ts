"use server";

/**
 * v0.22: cron å®šæ—¶ä½œä¸šçš„æ‰‹åŠ¨è§¦å‘å…¥å£ï¼ˆadmin onlyï¼‰
 *
 * ç”¨äºŽæµ‹è¯• / åº”æ€¥è§¦å‘ï¼Œä¸etc.åˆ°å®šæ—¶ç‚¹ã€‚
 */
import { requireSession } from "@/lib/auth/session";
import { runWeeklyReportPush } from "@/server/reports/push-weekly";
import { scanArchiveOverdue } from "./jobs/archive-overdue";
import { runAuditCleanup } from "./jobs/audit-cleanup";

async function requireAdmin() {
  const session = await requireSession();
  if (
    session.user.role !== "ADMIN" &&
    session.user.role !== "PRINCIPAL_LAWYER"
  ) {
    throw new Error(
      "Solo el Administrador / Abogado Principal puede activar esto",
    );
  }
  return session;
}

export async function triggerWeeklyReportNow() {
  const session = await requireAdmin();
  return runWeeklyReportPush(session.user.id);
}

export async function triggerArchiveOverdueScanNow() {
  await requireAdmin();
  return scanArchiveOverdue();
}

export async function triggerAuditCleanupNow() {
  await requireAdmin();
  return runAuditCleanup();
}


