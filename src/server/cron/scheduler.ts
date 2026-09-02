/**
 * v0.22: 进程内 cron 调度（node-cron）
 *
 * 在 next start 进程启动时Aprobar instrumentation.ts → register() 调用。
 *
 * 限制：
 * - **仅在 next start（生产）下生效**。dev 模式不跑（避免开发时误推Notificaciones）。
 * - 不支持 serverless（Vercel Edge / Lambda）。LawLink 自部署场景默认是
 *   长驻 Node 进程，OK。
 * - 进程重启会重新Registrarse定时作业；如果在触发时间点重启，可能错过本次。
 *
 * 当前定时作业：
 * - 每周一 09:00 推送本周Informe
 * - 每días 09:00 扫描归档Vencido 30 días的Caso
 * - 每días 03:00 清理超过 N días的 AuditLog
 *
 * 时区：所有 cron 用 Asia/Shanghai（避免容器 UTC 跑出来 8 小时偏差）。
 *
 * v0.26 cron 可观测性：
 * - 成功路径由各 job 内部自己写 *_CRON audit（已有）
 * - Error路径在此处统一捕获 + 写 *_FAILED_CRON audit，避免 cron 静默Error
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
  console.log(`[cron] ${triggeredAt} 触发：${jobName}`);
  try {
    const result = await fn();
    const durationMs = Date.now() - startedAt;
    console.log(`[cron] ${jobName} 完成（${durationMs}ms）`, result);
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : String(err);
    const stack =
      err instanceof Error
        ? err.stack?.split("\n").slice(0, 5).join("\n")
        : undefined;
    console.error(`[cron] ${jobName} 异常（${durationMs}ms）：`, err);
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
    console.warn("[cron] registerCronJobs 重复调用，跳过");
    return;
  }
  started = true;

  // 每周一 09:00 推周报
  cron.schedule(
    "0 9 * * 1",
    () =>
      runWithFailureAudit(
        "周报推送",
        "WEEKLY_REPORT_PUSH_FAILED_CRON",
        () => runWeeklyReportPush(null)
      ),
    { timezone: TIMEZONE }
  );

  // 每días 09:00 扫归档Vencido
  cron.schedule(
    "0 9 * * *",
    () =>
      runWithFailureAudit(
        "归档Vencido扫描",
        "ARCHIVE_OVERDUE_SCAN_FAILED_CRON",
        () => scanArchiveOverdue()
      ),
    { timezone: TIMEZONE }
  );

  // 每días 03:00 清理超过 N días的 AuditLog（默认 365 días，AUDIT_RETENTION_DAYS 可覆盖）
  cron.schedule(
    "0 3 * * *",
    () =>
      runWithFailureAudit(
        "AuditLog 清理",
        "AUDIT_CLEANUP_FAILED_CRON",
        () => runAuditCleanup()
      ),
    { timezone: TIMEZONE }
  );

  // v0.27: 每días 09:00 扫到期Plazo（T-3/T-1/T/T+1 四档），发 DEADLINE_REMINDER
  cron.schedule(
    "0 9 * * *",
    () =>
      runWithFailureAudit(
        "到期Recordatorios扫描",
        "DUE_REMINDER_SCAN_FAILED_CRON",
        () => scanDueReminders()
      ),
    { timezone: TIMEZONE }
  );

  // 每días 09:10 扫描已Aprobación但未回填盖章件的Solicitud de sello；同一申请 3 días内不重复Recordatorios
  cron.schedule(
    "10 9 * * *",
    () =>
      runWithFailureAudit(
        "用章盖章件回填Recordatorios扫描",
        "SEAL_BACKFILL_REMINDER_SCAN_FAILED_CRON",
        () => scanSealBackfillReminders()
      ),
    { timezone: TIMEZONE }
  );

  // v0.50: 每días 02:30 数据库+文件存储备份（BACKUP_CRON_ENABLED=false 可关）
  if (backupCronEnabled()) {
    cron.schedule(
      "30 2 * * *",
      () =>
        runWithFailureAudit(
          "数据库备份",
          "DATABASE_BACKUP_FAILED_CRON",
          () => runDatabaseBackup()
        ),
      { timezone: TIMEZONE }
    );
  }

  console.log(
    `[cron] 已Registrarse ${backupCronEnabled() ? 6 : 5} 个定时作业（周报推送 / 归档Vencido扫描 / AuditLog 清理 / 到期Recordatorios扫描 / 用章回填Recordatorios扫描${backupCronEnabled() ? " / 数据库备份" : ""}），时区 Asia/Shanghai`
  );
}
