/**
 * Guardia de solo lectura para archivo
 */
import { requireSession } from "@/lib/auth/session";
import { getTenantPrisma } from "@/lib/tenant-prisma";

type WritableGuardOptions = {
  allowedIfArchivedReason?: string;
  allowFinanceRole?: boolean;
};

async function findWritableMatter(
  matterId: string,
  opts?: Pick<WritableGuardOptions, "allowFinanceRole">
) {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  
  // Si es ADMIN o PRINCIPAL_LAWYER, acceso total
  if (session.user.role === "ADMIN" || session.user.role === "PRINCIPAL_LAWYER") {
    return prisma.matter.findFirst({
      where: { id: matterId, deletedAt: null },
      select: { status: true, archivedAt: true }
    });
  }
  
  // Para otros roles, filtrar por owner o miembro
  return prisma.matter.findFirst({
    where: {
      id: matterId,
      deletedAt: null,
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } }
      ]
    },
    select: { status: true, archivedAt: true }
  });
}

export async function assertMatterWritable(
  matterId: string | null | undefined,
  opts?: WritableGuardOptions
): Promise<void> {
  if (!matterId) return;
  const matter = await findWritableMatter(matterId, opts);
  if (!matter) throw new Error("Caso no existe o sin permiso para procesar");
  if (matter.status === "ARCHIVED") {
    throw new Error("Caso archivado, prohibido modificar");
  }
}

const ARCHIVE_FOLDER_NAMES = new Set(["Cerrar caso", "Archivo"]);

export function isArchiveFolderName(name: string | null | undefined): boolean {
  if (!name) return false;
  return ARCHIVE_FOLDER_NAMES.has(name);
}

export async function assertDocumentWritable(
  matterId: string | null | undefined,
  opts: { kind: "upload" | "modify"; folderName?: string | null; allowFinanceRole?: boolean }
): Promise<void> {
  if (!matterId) return;
  const matter = await findWritableMatter(matterId, opts);
  if (!matter) throw new Error("Caso no existe o sin permiso para procesar");
  if (matter.status !== "ARCHIVED") return;

  if (opts.kind === "modify") {
    throw new Error("Caso archivado, el material no se puede modificar o eliminar");
  }
  if (opts.kind === "upload" && !isArchiveFolderName(opts.folderName)) {
    throw new Error("Caso archivado, solo se permite subir materiales a la carpeta \"Cerrar caso\" o \"Archivo\"");
  }
}