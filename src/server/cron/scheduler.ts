<<<<<<< HEAD
export function registerCronJobs() {
  return;
=======
﻿/**
 * v0.22: è¿›ç¨‹å†… cron è°ƒåº¦ï¼ˆnode-cronï¼‰
 *
 * åœ¨ next start è¿›ç¨‹å¯åŠ¨æ—¶Aprobar instrumentation.ts â†’ register() è°ƒç”¨ã€‚
 *
 * é™åˆ¶ï¼š
 * - **ä»…åœ¨ next startï¼ˆç”Ÿäº§ï¼‰ä¸‹ç”Ÿæ•ˆ**ã€‚dev æ¨¡å¼ä¸è·‘ï¼ˆé¿å…å¼€å‘æ—¶è¯¯æŽ¨Notificacionesï¼‰ã€‚
 * - ä¸æ”¯æŒ serverlessï¼ˆVercel Edge / Lambdaï¼‰ã€‚LawLink è‡ªéƒ¨ç½²åœºæ™¯é»˜è®¤æ˜¯
 *   é•¿é©» Node è¿›ç¨‹ï¼ŒOKã€‚
 * - è¿›ç¨‹é‡å¯ä¼šé‡æ–°Registrarseå®šæ—¶ä½œä¸šï¼›å¦‚æžœåœ¨è§¦å‘æ—¶é—´ç‚¹é‡å¯ï¼Œå¯èƒ½é”™è¿‡æœ¬æ¬¡ã€‚
 *
 * å½“å‰å®šæ—¶ä½œä¸šï¼š
 * - æ¯å‘¨ä¸€ 09:00 æŽ¨é€æœ¬å‘¨Informe
 * - æ¯dÃ­as 09:00 æ‰«æå½’æ¡£Vencido 30 dÃ­asçš„Caso
 * - æ¯dÃ­as 03:00 æ¸…ç†è¶…è¿‡ N dÃ­asçš„ AuditLog
 *
 * æ—¶åŒºï¼šæ‰€æœ‰ cron ç”¨ Asia/Shanghaiï¼ˆé¿å…å®¹å™¨ UTC è·‘å‡ºæ¥ 8 å°æ—¶åå·®ï¼‰ã€‚
 *
 * v0.26 cron å¯è§‚æµ‹æ€§ï¼š
 * - æˆåŠŸè·¯å¾„ç”±å„ job å†…éƒ¨è‡ªå·±å†™ *_CRON auditï¼ˆå·²æœ‰ï¼‰
 * - Errorè·¯å¾„åœ¨æ­¤å¤„ç»Ÿä¸€æ•èŽ· + å†™ *_FAILED_CRON auditï¼Œé¿å… cron é™é»˜Error
 */
import cron from "node-cron";
import { runWeeklyReportPush } from "@/server/reports/push-weekly";
import { scanArchiveOverdue } from "./jobs/archive-overdue";
import { runAuditCleanup } from "./jobs/audit-cleanup";
import { scanDueReminders } from "./jobs/scan-due-reminders";
import { scanSealBackfillReminders } from "./jobs/scan-seal-backfill-reminders";
import { runDatabaseBackup, backupCronEnabled } from "./jobs/backup-database";
import { audit } from "@/server/audit";

const TIMEZONE = "Asia/Shanghai";
let started = false;

async function runWithFailureAudit(
  jobName: string,
  failureAction: string,
  fn: () => Promise<unknown>
) {
  const startedAt = Date.now();
  const triggeredAt = new Date().toISOString();
  console.log(`[cron] ${triggeredAt} è§¦å‘ï¼š${jobName}`);
  try {
    const result = await fn();
    const durationMs = Date.now() - startedAt;
    console.log(`[cron] ${jobName} å®Œæˆï¼ˆ${durationMs}msï¼‰`, result);
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : String(err);
    const stack =
      err instanceof Error
        ? err.stack?.split("\n").slice(0, 5).join("\n")
        : undefined;
    console.error(`[cron] ${jobName} å¼‚å¸¸ï¼ˆ${durationMs}msï¼‰ï¼š`, err);
    await audit({
      userId: null,
      action: failureAction,
      targetType: "Cron",
      targetId: jobName,
      detail: { error: message, stack, durationMs, triggeredAt }
    });
  }
}

export function registerCronJobs() {
  if (started) {
    console.warn("[cron] registerCronJobs é‡å¤è°ƒç”¨ï¼Œè·³è¿‡");
    return;
  }
  started = true;

  // æ¯å‘¨ä¸€ 09:00 æŽ¨å‘¨æŠ¥
  cron.schedule(
    "0 9 * * 1",
    () =>
      runWithFailureAudit(
        "å‘¨æŠ¥æŽ¨é€",
        "WEEKLY_REPORT_PUSH_FAILED_CRON",
        () => runWeeklyReportPush(null)
      ),
    { timezone: TIMEZONE }
  );

  // æ¯dÃ­as 09:00 æ‰«å½’æ¡£Vencido
  cron.schedule(
    "0 9 * * *",
    () =>
      runWithFailureAudit(
        "å½’æ¡£Vencidoæ‰«æ",
        "ARCHIVE_OVERDUE_SCAN_FAILED_CRON",
        () => scanArchiveOverdue()
      ),
    { timezone: TIMEZONE }
  );

  // æ¯dÃ­as 03:00 æ¸…ç†è¶…è¿‡ N dÃ­asçš„ AuditLogï¼ˆé»˜è®¤ 365 dÃ­asï¼ŒAUDIT_RETENTION_DAYS å¯è¦†ç›–ï¼‰
  cron.schedule(
    "0 3 * * *",
    () =>
      runWithFailureAudit(
        "AuditLog æ¸…ç†",
        "AUDIT_CLEANUP_FAILED_CRON",
        () => runAuditCleanup()
      ),
    { timezone: TIMEZONE }
  );

  // v0.27: æ¯dÃ­as 09:00 æ‰«åˆ°æœŸPlazoï¼ˆT-3/T-1/T/T+1 å››æ¡£ï¼‰ï¼Œå‘ DEADLINE_REMINDER
  cron.schedule(
    "0 9 * * *",
    () =>
      runWithFailureAudit(
        "åˆ°æœŸRecordatoriosæ‰«æ",
        "DUE_REMINDER_SCAN_FAILED_CRON",
        () => scanDueReminders()
      ),
    { timezone: TIMEZONE }
  );

  // æ¯dÃ­as 09:10 æ‰«æå·²AprobaciÃ³nä½†æœªå›žå¡«ç›–ç« ä»¶çš„Solicitud de selloï¼›åŒä¸€ç”³è¯· 3 dÃ­aså†…ä¸é‡å¤Recordatorios
  cron.schedule(
    "10 9 * * *",
    () =>
      runWithFailureAudit(
        "ç”¨ç« ç›–ç« ä»¶å›žå¡«Recordatoriosæ‰«æ",
        "SEAL_BACKFILL_REMINDER_SCAN_FAILED_CRON",
        () => scanSealBackfillReminders()
      ),
    { timezone: TIMEZONE }
  );

  // v0.50: æ¯dÃ­as 02:30 æ•°æ®åº“+æ–‡ä»¶å­˜å‚¨å¤‡ä»½ï¼ˆBACKUP_CRON_ENABLED=false å¯å…³ï¼‰
  if (backupCronEnabled()) {
    cron.schedule(
      "30 2 * * *",
      () =>
        runWithFailureAudit(
          "æ•°æ®åº“å¤‡ä»½",
          "DATABASE_BACKUP_FAILED_CRON",
          () => runDatabaseBackup()
        ),
      { timezone: TIMEZONE }
    );
  }

  console.log(
    `[cron] å·²Registrarse ${backupCronEnabled() ? 6 : 5} ä¸ªå®šæ—¶ä½œä¸šï¼ˆå‘¨æŠ¥æŽ¨é€ / å½’æ¡£Vencidoæ‰«æ / AuditLog æ¸…ç† / åˆ°æœŸRecordatoriosæ‰«æ / ç”¨ç« å›žå¡«Recordatoriosæ‰«æ${backupCronEnabled() ? " / æ•°æ®åº“å¤‡ä»½" : ""}ï¼‰ï¼Œæ—¶åŒº Asia/Shanghai`
  );
>>>>>>> 1730f21e93d6111622e2de74ba5997edf8ea6291
}


