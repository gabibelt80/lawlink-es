/**
 * v0.50: æ•°æ®åº“ + æ–‡ä»¶å­˜å‚¨è‡ªåŠ¨å¤‡ä»½ï¼ˆPRD Â§å…­æ‰¿è¯ºçš„"å†…ç½®å¤‡ä»½"æœ€åŽä¸€å…¬é‡Œï¼‰ã€‚
 *
 * æ¯dÃ­as 02:30 è°ƒ scripts/backup.shï¼ˆpg_dump + storage æ‰“åŒ…ï¼‰ï¼Œå¤‡ä»½åˆ°
 * BACKUP_DIRï¼ˆé»˜è®¤ ./backupsï¼‰ï¼Œå¹¶åšä¿ç•™æ•°æ¸…ç†ï¼ˆBACKUP_KEEPï¼Œé»˜è®¤ 14 ä»½ï¼‰ã€‚
 * Erroræ—¶ç»™æ‰€æœ‰ ADMIN å‘ç«™å†…Notificacionesâ€”â€”å¤‡ä»½é™é»˜Erroretc.äºŽæ²¡æœ‰å¤‡ä»½ã€‚
 *
 * Cerraræ–¹å¼ï¼šçŽ¯å¢ƒå˜é‡ BACKUP_CRON_ENABLED=falseï¼ˆéƒ¨ç½²çŽ¯å¢ƒæ²¡æœ‰ pg_dump æ—¶ï¼‰ã€‚
 */
import { spawn } from "node:child_process";
import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/server/notifications/create";
import { audit } from "@/server/audit";

const BACKUP_SCRIPT = path.join(process.cwd(), "scripts", "backup.sh");
const BACKUP_TIMEOUT_MS = 10 * 60 * 1000;

export type BackupResult = {
  ok: boolean;
  skipped?: boolean;
  backupDir?: string;
  removedOld?: number;
  error?: string;
};

export function backupCronEnabled(): boolean {
  return process.env.BACKUP_CRON_ENABLED !== "false";
}

function backupBaseDir(): string {
  return process.env.BACKUP_DIR || path.join(process.cwd(), "backups");
}

function keepCount(): number {
  const n = parseInt(process.env.BACKUP_KEEP ?? "14", 10);
  return Number.isInteger(n) && n > 0 ? n : 14;
}

function runScript(baseDir: string): Promise<{ code: number; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("bash", [BACKUP_SCRIPT, baseDir], {
      cwd: process.cwd(),
      env: process.env
    });
    let output = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("å¤‡ä»½è¶…æ—¶ï¼ˆ10 åˆ†é’Ÿï¼‰"));
    }, BACKUP_TIMEOUT_MS);
    child.stdout.on("data", (d) => (output += String(d)));
    child.stderr.on("data", (d) => (output += String(d)));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, output });
    });
  });
}

/** åªä¿ç•™æœ€è¿‘ N ä»½å¤‡ä»½ç›®å½•ï¼ˆç›®å½•åä»¥æ—¶é—´æˆ³å¼€å¤´ï¼Œå­—å…¸åºå³æ—¶é—´åºï¼‰ */
async function pruneOldBackups(baseDir: string, keep: number): Promise<number> {
  let entries: string[];
  try {
    entries = await readdir(baseDir);
  } catch {
    return 0;
  }
  const backupDirs: string[] = [];
  for (const name of entries) {
    if (!/^\d{8}_\d{6}$/.test(name)) continue; // åªæ¸…ç†æœ¬è„šæœ¬äº§ç”Ÿçš„ç›®å½•
    const full = path.join(baseDir, name);
    try {
      if ((await stat(full)).isDirectory()) backupDirs.push(name);
    } catch {
      // å¿½ç•¥è¯»å–Errorçš„æ¡ç›®
    }
  }
  backupDirs.sort();
  const toRemove = backupDirs.slice(0, Math.max(0, backupDirs.length - keep));
  for (const name of toRemove) {
    await rm(path.join(baseDir, name), { recursive: true, force: true });
  }
  return toRemove.length;
}

async function notifyAdmins(title: string, content: string) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", active: true },
    select: { id: true }
  });
  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      type: "SYSTEM",
      priority: "HIGH",
      title,
      content,
      href: "/settings"
    });
  }
}

export async function runDatabaseBackup(): Promise<BackupResult> {
  if (!backupCronEnabled()) {
    return { ok: false, skipped: true };
  }

  const baseDir = backupBaseDir();
  try {
    const { code, output } = await runScript(baseDir);
    if (code !== 0) {
      throw new Error(`backup.sh Cerrar sesiÃ³nç  ${code}ï¼š${output.slice(-500)}`);
    }
    const removedOld = await pruneOldBackups(baseDir, keepCount());

    await audit({
      userId: null,
      action: "DATABASE_BACKUP_CRON",
      targetType: "Backup",
      targetId: baseDir,
      detail: { removedOld, keep: keepCount() }
    });
    return { ok: true, backupDir: baseDir, removedOld };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await notifyAdmins(
      "æ•°æ®åº“è‡ªåŠ¨å¤‡ä»½Error",
      `${message.slice(0, 300)}ï½œè¯·æ£€æŸ¥ pg_dump æ˜¯å¦å¯ç”¨ã€BACKUP_DIR æ˜¯å¦å¯å†™ï¼›ä¿®å¤å‰Sistemaæ²¡æœ‰æ–°å¤‡ä»½ã€‚`
    );
    // æŠ›å‡ºè®© scheduler ç»Ÿä¸€å†™ *_FAILED_CRON audit
    throw err;
  }
}


