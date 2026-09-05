/**
 * AuditLog ä¿ç•™ç­–ç•¥ï¼šæ¯dÃ­as 03:00 åˆ è¶…è¿‡ N dÃ­asçš„æ—§è®°å½•ã€‚
 *
 * é»˜è®¤ 365 dÃ­asï¼›çŽ¯å¢ƒå˜é‡ AUDIT_RETENTION_DAYS å¯è¦†ç›–ï¼ˆå¦‚è®¾ 90 = 3 ä¸ªæœˆï¼‰ã€‚
 * AuditLog è¡¨æ—  FK åå‘å¼•ç”¨ï¼Œå®‰å…¨ hard deleteã€‚
 */
import { prisma } from "@/lib/prisma";
import { audit } from "@/server/audit";

const DEFAULT_RETENTION_DAYS = 365;

export type AuditCleanupResult = {
  retentionDays: number;
  deleted: number;
  cutoffDate: string;
};

export async function runAuditCleanup(): Promise<AuditCleanupResult> {
  const envDays = Number(process.env.AUDIT_RETENTION_DAYS);
  const retentionDays =
    Number.isFinite(envDays) && envDays > 0 ? envDays : DEFAULT_RETENTION_DAYS;
  const cutoff = new Date(Date.now() - retentionDays * 86400_000);

  const { count } = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } }
  });

  // è‡ªå·±å†™ä¸€æ¡ audit ç•™ç—•ï¼ˆè¿™æ¡ 365 dÃ­asåŽåˆä¼šè¢«è‡ªå·±åˆ ï¼Œä½†çŸ­æœŸå†…å¯æŸ¥ï¼‰
  await audit({
    userId: null,
    action: "AUDIT_CLEANUP_CRON",
    targetType: "AuditLog",
    targetId: "retention",
    detail: {
      retentionDays,
      cutoffDate: cutoff.toISOString().slice(0, 10),
      deleted: count
    }
  });

  return {
    retentionDays,
    deleted: count,
    cutoffDate: cutoff.toISOString().slice(0, 10)
  };
}


