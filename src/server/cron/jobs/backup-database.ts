/**
 * v0.50: Backup automático de base de datos + archivos (PRD §6 "backup integrado").
 *
 * Todos los días a las 02:30 ejecuta scripts/backup.sh (pg_dump + storage empaquetado),
 * guarda en BACKUP_DIR (por defecto ./backups) y aplica retención
 * (BACKUP_KEEP, por defecto 14 copias).
 * Si hay error, notifica a todos los ADMIN — si el backup falla, no hay respaldo.
 *
 * Forma de desactivar: variable de entorno BACKUP_CRON_ENABLED=false
 * (para entornos sin pg_dump).
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
      env: process.env,
    });
    let output = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Backup excedió el tiempo límite (10 minutos)"));
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

/** Conserva solo las últimas N copias de backup (nombre con timestamp, orden lexicográfico = orden temporal) */
async function pruneOldBackups(baseDir: string, keep: number): Promise<number> {
  let entries: string[];
  try {
    entries = await readdir(baseDir);
  } catch {
    return 0;
  }
  const backupDirs: string[] = [];
  for (const name of entries) {
    if (!/^\d{8}_\d{6}$/.test(name)) continue; // solo limpia directorios creados por este script
    const full = path.join(baseDir, name);
    try {
      if ((await stat(full)).isDirectory()) backupDirs.push(name);
    } catch {
      // Ignorar si falla la lectura
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
    select: { id: true },
  });
  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      type: "SYSTEM",
      priority: "HIGH",
      title,
      content,
      href: "/settings",
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
      throw new Error(`backup.sh terminó con código ${code}: ${output.slice(-500)}`);
    }
    const removedOld = await pruneOldBackups(baseDir, keepCount());

    await audit({
      userId: null,
      action: "DATABASE_BACKUP_CRON",
      targetType: "Backup",
      targetId: baseDir,
      detail: { removedOld, keep: keepCount() },
    });
    return { ok: true, backupDir: baseDir, removedOld };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await notifyAdmins(
      "Error en backup automático de base de datos",
      `${message.slice(0, 300)} | Verificá que pg_dump esté disponible y que BACKUP_DIR sea escribible; si no, el sistema no tiene nuevos respaldos.`,
    );
    // Re-lanzar para que el scheduler registre el *_FAILED_CRON audit
    throw err;
  }
}
