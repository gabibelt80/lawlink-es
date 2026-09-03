/**
 * v0.9.4 å½’æ¡£åªè¯»é—¨ç¦
 *
 * ç­–ç•¥ï¼ˆç”¨æˆ·é€‰æ‹©"ä¸­"ï¼‰ï¼š
 *   - Caso status === "ARCHIVED" åŽï¼šä¸šåŠ¡å†™Accioneså…¨ç¦
 *   - ä¾‹å¤–ï¼šè¡¥ä¼ ææ–™åˆ° ARCHIVE å·å®—ï¼ˆCerrar caso/å½’æ¡£ï¼‰å…è®¸
 *
 * è°ƒç”¨æ–¹å¼ï¼ˆæ¯ä¸ªå†™Acciones server action å…¥å£ï¼‰ï¼š
 *   await assertMatterWritable(matterId);
 *
 * æ–‡æ¡£ä¸Šä¼  / Eliminar éœ€è¦ isArchiveFolder() é…åˆæ”¾è¡Œ ARCHIVE å·å®—ã€‚
 */
import { requireSession } from "@/lib/auth/session";
import { matterAssociationFilter } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type WritableGuardOptions = {
  allowedIfArchivedReason?: string;
  allowFinanceRole?: boolean;
};

async function findWritableMatter(
  matterId: string,
  opts?: Pick<WritableGuardOptions, "allowFinanceRole">
) {
  const session = await requireSession();
  const allowByFinanceRole = opts?.allowFinanceRole && session.user.role === "FINANCE";
  return prisma.matter.findFirst({
    where: {
      id: matterId,
      deletedAt: null,
      ...(allowByFinanceRole ? {} : matterAssociationFilter(session.user.id))
    },
    select: { status: true, archivedAt: true }
  });
}

/**
 * å·²å½’æ¡£Casoè§†ä¸ºåªè¯»ã€‚æŠ›é”™ï¼ˆä¸­æ–‡ï¼‰ç”± UI catch æ˜¾ç¤º toastã€‚
 */
export async function assertMatterWritable(
  matterId: string | null | undefined,
  opts?: WritableGuardOptions
): Promise<void> {
  if (!matterId) return;
  const matter = await findWritableMatter(matterId, opts);
  if (!matter) throw new Error("Casoä¸å­˜åœ¨æˆ–æ— æƒå¤„ç†");
  if (matter.status === "ARCHIVED") {
    const detail = opts?.allowedIfArchivedReason
      ? `ï¼ˆ${opts.allowedIfArchivedReason}é™¤å¤–ï¼‰`
      : "";
    throw new Error(`Casoå·²å½’æ¡£ï¼Œç¦æ­¢ä¿®æ”¹${detail}`);
  }
}

/**
 * åˆ¤å®š folder æ˜¯å¦ä¸º ARCHIVE å·å®—ï¼ˆCerrar caso / å½’æ¡£ï¼‰ï¼Œç”¨äºŽä¸Šä¼ ææ–™é—¨ç¦æ”¾è¡Œã€‚
 * å‘½ä¸­æ¡ä»¶ï¼šname å‘½ä¸­ ["Cerrar caso", "å½’æ¡£"] ä¹‹ä¸€ï¼ˆy default-folders.ts ä¸€è‡´ï¼‰ã€‚
 */
const ARCHIVE_FOLDER_NAMES = new Set(["Cerrar caso", "å½’æ¡£"]);

export function isArchiveFolderName(name: string | null | undefined): boolean {
  if (!name) return false;
  return ARCHIVE_FOLDER_NAMES.has(name);
}

/**
 * æ–‡æ¡£Accionesé—¨ç¦ï¼šå½’æ¡£åŽåªå…è®¸ä¸Šä¼ åˆ° ARCHIVE å·å®—ã€‚Eliminar/é‡å‘½å/ç§»åŠ¨ä¸€å¾‹ç¦æ­¢ã€‚
 */
export async function assertDocumentWritable(
  matterId: string | null | undefined,
  opts: { kind: "upload" | "modify"; folderName?: string | null; allowFinanceRole?: boolean }
): Promise<void> {
  if (!matterId) return;
  const matter = await findWritableMatter(matterId, opts);
  if (!matter) throw new Error("Casoä¸å­˜åœ¨æˆ–æ— æƒå¤„ç†");
  if (matter.status !== "ARCHIVED") return;

  if (opts.kind === "modify") {
    throw new Error("Casoå·²å½’æ¡£ï¼Œææ–™ä¸å¯ä¿®æ”¹æˆ–Eliminar");
  }
  if (opts.kind === "upload" && !isArchiveFolderName(opts.folderName)) {
    throw new Error("Casoå·²å½’æ¡£ï¼Œä»…å…è®¸è¡¥ä¼ ææ–™åˆ°ã€ŒCerrar casoã€æˆ–ã€Œå½’æ¡£ã€å·å®—");
  }
}

