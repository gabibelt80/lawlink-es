/**
 * v0.9.4 Guardia de solo lectura para archivo
 *
 * Estrategia (elegida por el usuario):
 *   - Despues de que el estado del caso sea "ARCHIVED": todas las acciones de escritura estan prohibidas
 *   - Excepcion: subir materiales a la carpeta ARCHIVE (Cerrar caso/Archivo) esta permitido
 *
 * Modo de uso (entrada de cada server action de escritura):
 *   await assertMatterWritable(matterId);
 *
 * Subir / Eliminar documentos requiere isArchiveFolder() para permitir la carpeta ARCHIVE.
 */
import { requireSession } from "@/lib/auth/session";
import { matterAssociationFilter } from "@/lib/permissions";
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
 * Caso archivado se considera solo lectura. El error lo muestra la UI como toast.
 */
export async function assertMatterWritable(
  matterId: string | null | undefined,
  opts?: WritableGuardOptions
): Promise<void> {
  if (!matterId) return;
  const matter = await findWritableMatter(matterId, opts);
  if (!matter) throw new Error("Caso no existe o sin permiso para procesar");
  if (matter.status === "ARCHIVED") {
    const detail = opts?.allowedIfArchivedReason
      ? `(${opts.allowedIfArchivedReason} excepto)`
      : "";
    throw new Error(`Caso archivado, prohibido modificar${detail}`);
  }
}

/**
 * Determina si la carpeta es ARCHIVE (Cerrar caso / Archivo), usado para permitir subir materiales.
 * Condicion: name coincide con ["Cerrar caso", "Archivo"] (consistente con default-folders.ts).
 */
const ARCHIVE_FOLDER_NAMES = new Set(["Cerrar caso", "Archivo"]);

export function isArchiveFolderName(name: string | null | undefined): boolean {
  if (!name) return false;
  return ARCHIVE_FOLDER_NAMES.has(name);
}

/**
 * Guardia para documentos: despues del archivo solo se permite subir a la carpeta ARCHIVE.
 * Eliminar/renombrar/mover queda prohibido.
 */
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