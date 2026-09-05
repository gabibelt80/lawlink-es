/**
 * å½’æ¡£Vencidoé¢„è­¦ï¼šæ‰«æå·²Cerrar casoä½†è¶…è¿‡ 30 dÃ­asæœªEnviarå½’æ¡£çš„Casoï¼Œç»™ä¸»åŠžAbogadoå‘Notificacionesã€‚
 *
 * ä¸šåŠ¡é€»è¾‘ï¼š
 * - status = CLOSED ä¸” closedAt < now - 30 dÃ­as
 * - æœªç”Ÿæˆ ArchiveRecordï¼ˆæˆ–éƒ½è¢« REJECTEDï¼‰
 * - åŒä¸€Caso 30 dÃ­aså†…ä¸é‡å¤å‘é¢„è­¦ï¼ˆrefId å”¯ä¸€æ€§ï¼‰
 */
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/server/notifications/create";
import { audit } from "@/server/audit";
import { matterHref } from "@/lib/matters/route";

const OVERDUE_DAYS = 30;
const REPEAT_SUPPRESS_DAYS = 30;

export type OverdueScanResult = {
  scanned: number;
  notified: number;
  suppressed: number;
};

export async function scanArchiveOverdue(): Promise<OverdueScanResult> {
  const cutoff = new Date(Date.now() - OVERDUE_DAYS * 86400_000);

  const candidates = await prisma.matter.findMany({
    where: {
      status: "CLOSED",
      closedAt: { lt: cutoff },
      deletedAt: null
    },
    select: {
      id: true,
      title: true,
      internalCode: true,
      ownerId: true,
      closedAt: true,
      archiveRecords: {
        where: { status: { in: ["PENDING_REVIEW", "APPROVED"] } },
        select: { id: true },
        take: 1
      }
    }
  });

  // æŽ’é™¤å·²æœ‰è¿›è¡Œä¸­æˆ–å·²Aprobarçš„å½’æ¡£
  const target = candidates.filter((m) => m.archiveRecords.length === 0);

  // é˜²é‡ï¼šæ‹‰æœ€è¿‘ 30 dÃ­aså·²å‘è¿‡çš„"ARCHIVE_OVERDUE"Notificacionesï¼ˆrefId = matterIdï¼‰
  const repeatCutoff = new Date(Date.now() - REPEAT_SUPPRESS_DAYS * 86400_000);
  const matterIds = target.map((m) => m.id);
  const recentNotified = await prisma.notification.findMany({
    where: {
      refType: "ArchiveOverdue",
      refId: { in: matterIds },
      createdAt: { gte: repeatCutoff }
    },
    select: { refId: true }
  });
  const suppressedIds = new Set(recentNotified.map((n) => n.refId));

  let notified = 0;
  let suppressed = 0;
  for (const m of target) {
    if (!m.id || !m.ownerId || !m.closedAt) continue;
    if (suppressedIds.has(m.id)) {
      suppressed++;
      continue;
    }
    const days = Math.floor((Date.now() - m.closedAt.getTime()) / 86400_000);
    await createNotification({
      userId: m.ownerId,
      type: "SYSTEM",
      priority: "HIGH",
      title: `å½’æ¡£Vencidoï¼š${m.internalCode}Â·${m.title}`,
      content: `Casoå·²ç»“ ${days} dÃ­asä½†æœªEnviarå½’æ¡£ï¼Œè¯·å°½å¿«è¡¥å…¨ææ–™åŽEnviarå½’æ¡£ç”³è¯·ã€‚`,
      href: matterHref(m),
      refType: "ArchiveOverdue",
      refId: m.id
    });
    notified++;
  }

  await audit({
    userId: null,
    action: "ARCHIVE_OVERDUE_SCAN_CRON",
    targetType: "Report",
    targetId: "archive-overdue",
    detail: {
      scanned: candidates.length,
      target: target.length,
      notified,
      suppressed,
      overdueDays: OVERDUE_DAYS
    }
  });

  return {
    scanned: candidates.length,
    notified,
    suppressed
  };
}


