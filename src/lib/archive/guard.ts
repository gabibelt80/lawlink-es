/**
 * v0.9.4 归档只读门禁
 *
 * 策略（用户选择"中"）：
 *   - Caso status === "ARCHIVED" 后：业务写Acciones全禁
 *   - 例外：补传材料到 ARCHIVE 卷宗（Cerrar caso/归档）允许
 *
 * 调用方式（每个写Acciones server action 入口）：
 *   await assertMatterWritable(matterId);
 *
 * 文档上传 / Eliminar 需要 isArchiveFolder() 配合放行 ARCHIVE 卷宗。
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
 * 已归档Caso视为只读。抛错（中文）由 UI catch 显示 toast。
 */
export async function assertMatterWritable(
  matterId: string | null | undefined,
  opts?: WritableGuardOptions
): Promise<void> {
  if (!matterId) return;
  const matter = await findWritableMatter(matterId, opts);
  if (!matter) throw new Error("Caso不存在或无权处理");
  if (matter.status === "ARCHIVED") {
    const detail = opts?.allowedIfArchivedReason
      ? `（${opts.allowedIfArchivedReason}除外）`
      : "";
    throw new Error(`Caso已归档，禁止修改${detail}`);
  }
}

/**
 * 判定 folder 是否为 ARCHIVE 卷宗（Cerrar caso / 归档），用于上传材料门禁放行。
 * 命中条件：name 命中 ["Cerrar caso", "归档"] 之一（y default-folders.ts 一致）。
 */
const ARCHIVE_FOLDER_NAMES = new Set(["Cerrar caso", "归档"]);

export function isArchiveFolderName(name: string | null | undefined): boolean {
  if (!name) return false;
  return ARCHIVE_FOLDER_NAMES.has(name);
}

/**
 * 文档Acciones门禁：归档后只允许上传到 ARCHIVE 卷宗。Eliminar/重命名/移动一律禁止。
 */
export async function assertDocumentWritable(
  matterId: string | null | undefined,
  opts: { kind: "upload" | "modify"; folderName?: string | null; allowFinanceRole?: boolean }
): Promise<void> {
  if (!matterId) return;
  const matter = await findWritableMatter(matterId, opts);
  if (!matter) throw new Error("Caso不存在或无权处理");
  if (matter.status !== "ARCHIVED") return;

  if (opts.kind === "modify") {
    throw new Error("Caso已归档，材料不可修改或Eliminar");
  }
  if (opts.kind === "upload" && !isArchiveFolderName(opts.folderName)) {
    throw new Error("Caso已归档，仅允许补传材料到「Cerrar caso」或「归档」卷宗");
  }
}
