"use server";

/**
 * v0.38: Recordatoriosæ‰«æçš„å¯è°ƒç”¨ Server Action å…¥å£ã€‚
 *
 * å•ç‹¬æˆæ–‡ä»¶ï¼ˆé¡¶å±‚ "use server"ï¼‰æ˜¯å› ä¸º scan-due-reminders.ts åŒæ—¶å¯¼å‡ºæ™®é€šå‡½æ•°ï¼Œ
 * å†…è” "use server" æ— æ³•è¢«Clienteç«¯ç»„ä»¶ importï¼ˆNext 14 é™åˆ¶ï¼‰ã€‚
 */
import { scanDueReminders, type DueReminderScanResult } from "@/server/cron/jobs/scan-due-reminders";
import { requireSession } from "@/lib/auth/session";

/** admin / ä¸»ä»»Abogadoå¯ç«‹å³æ‰«ä¸€éï¼ˆç°åº¦éªŒè¯ + Urgenteè¡¥æŽ¨ + æœ¬åœ° dev éªŒè¯ï¼‰ */
export async function triggerDueReminderScan(): Promise<DueReminderScanResult> {
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("ä»…Administrarå‘˜ / ä¸»ä»»Abogadoå¯æ‰‹åŠ¨è§¦å‘åˆ°æœŸRecordatoriosæ‰«æ");
  }
  return scanDueReminders();
}


