"use server";

import cron from "node-cron";
import { runWeeklyReportPush } from "@/server/reports/push-weekly";
import { scanArchiveOverdue } from "./jobs/archive-overdue";
import { runAuditCleanup } from "./jobs/audit-cleanup";
import { scanDueReminders } from "./jobs/scan-due-reminders";
import { scanSealBackfillReminders } from "./jobs/scan-seal-backfill-reminders";
import { runDatabaseBackup, backupCronEnabled } from "./jobs/backup-database";
import { audit } from "@/server/audit";

const TIMEZONE = "America/Argentina/Buenos_Aires";
let started = false;

async function runWithFailureAudit(
  jobName: string,
  failureAction: string,
  fn: () => Promise<unknown>
) {
  const startedAt = Date.now();
  const triggeredAt = new Date().toISOString();
  console.log(`[cron] ${triggeredAt} disparado: ${jobName}`);
  try {
    const result = await fn();
    const durationMs = Date.now() - startedAt;
    console.log(`[cron] ${jobName} completado (${durationMs}ms)`, result);
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : String(err);
    const stack =
      err instanceof Error
        ? err.stack?.split("\n").slice(0, 5).join("\n")
        : undefined;
    console.error(`[cron] ${jobName} error (${durationMs}ms):`, err);
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
    console.warn("[cron] registerCronJobs ya fue llamado, se omite");
    return;
  }
  started = true;

  // Lunes 09:00 - informe semanal
  cron.schedule(
    "0 9 * * 1",
    () =>
      runWithFailureAudit(
        "Informe semanal",
        "WEEKLY_REPORT_PUSH_FAILED_CRON",
        () => runWeeklyReportPush(null)
      ),
    { timezone: TIMEZONE }
  );

  // Todos los días 09:00 - escaneo de archivos vencidos
  cron.schedule(
    "0 9 * * *",
    () =>
      runWithFailureAudit(
        "Escaneo de archivos vencidos",
        "ARCHIVE_OVERDUE_SCAN_FAILED_CRON",
        () => scanArchiveOverdue()
      ),
    { timezone: TIMEZONE }
  );

  // Todos los días 03:00 - limpieza de auditoría
  cron.schedule(
    "0 3 * * *",
    () =>
      runWithFailureAudit(
        "Limpieza de auditoría",
        "AUDIT_CLEANUP_FAILED_CRON",
        () => runAuditCleanup()
      ),
    { timezone: TIMEZONE }
  );

  // Todos los días 09:00 - escaneo de recordatorios vencidos
  cron.schedule(
    "0 9 * * *",
    () =>
      runWithFailureAudit(
        "Escaneo de recordatorios vencidos",
        "DUE_REMINDER_SCAN_FAILED_CRON",
        () => scanDueReminders()
      ),
    { timezone: TIMEZONE }
  );

  // Todos los días 09:10 - recordatorios de sellos
  cron.schedule(
    "10 9 * * *",
    () =>
      runWithFailureAudit(
        "Escaneo de recordatorios de sellos",
        "SEAL_BACKFILL_REMINDER_SCAN_FAILED_CRON",
        () => scanSealBackfillReminders()
      ),
    { timezone: TIMEZONE }
  );

  // Todos los días 02:30 - backup de base de datos
  if (backupCronEnabled()) {
    cron.schedule(
      "30 2 * * *",
      () =>
        runWithFailureAudit(
          "Backup de base de datos",
          "DATABASE_BACKUP_FAILED_CRON",
          () => runDatabaseBackup()
        ),
      { timezone: TIMEZONE }
    );
  }

  console.log(
    `[cron] ${backupCronEnabled() ? 6 : 5} tareas programadas registradas`
  );
}