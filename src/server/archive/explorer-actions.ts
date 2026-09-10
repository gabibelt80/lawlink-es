"use server";

import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";

/**
 * Lista las carpetas de TODOS los casos (activos y archivados)
 * con sus documentos dentro de cada carpeta.
 * 
 * Usado por el Explorador de Carpetas para descargar archivos.
 */
export async function listCaseFolders() {
  const prisma = await getTenantPrisma();
  await requireSession();

  const matters = await prisma.matter.findMany({
    where: {
      deletedAt: null,
      // Mostrar todos los casos con documentos o carpetas
      OR: [
        { folders: { some: {} } },
        { documents: { some: { deletedAt: null } } },
      ],
    },
    select: {
      id: true,
      internalCode: true,
      firmCaseNo: true,
      title: true,
      status: true,
      archivedAt: true,
      folders: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          name: true,
          orderIndex: true,
          documents: {
            where: { deletedAt: null },
            select: {
              id: true,
              name: true,
              mimeType: true,
              size: true,
              path: true,
              folderId: true,
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      // Documentos sin carpeta (folderId = null)
      documents: {
        where: { deletedAt: null, folderId: null },
        select: {
          id: true,
          name: true,
          mimeType: true,
          size: true,
          path: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [
      { archivedAt: "desc" },
      { updatedAt: "desc" },
    ],
  });

  const result = matters.map((matter) => ({
    id: matter.id,
    internalCode: matter.internalCode,
    firmCaseNo: matter.firmCaseNo,
    title: matter.title,
    status: matter.status,
    archivedAt: matter.archivedAt,
    folders: matter.folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      orderIndex: folder.orderIndex,
      documents: folder.documents.map((doc) => ({
        id: doc.id,
        name: doc.name,
        mimeType: doc.mimeType,
        size: doc.size,
        folderId: folder.id,
      })),
    })),
    rootDocuments: matter.documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      mimeType: doc.mimeType,
      size: doc.size,
      folderId: null,
    })),
  }));

  return result;
}

/**
 * Registra una descarga en el log de auditoría
 */
export async function logDownloadAction(input: {
  matterId: string;
  matterTitle: string;
  items: { id: string; name: string; type: "file" | "folder" }[];
}) {
  const session = await requireSession();

  await audit({
    userId: session.user.id,
    action: "ARCHIVE_DOWNLOAD",
    targetType: "Matter",
    targetId: input.matterId,
    detail: {
      matterTitle: input.matterTitle,
      downloadedItems: input.items,
      downloadedAt: new Date().toISOString(),
    },
  });

  return { ok: true };
}

/**
 * Obtiene el log de descargas recientes
 */
export async function getDownloadLogs() {
  const prisma = await getTenantPrisma();
  await requireSession();

  const logs = await prisma.auditLog.findMany({
    where: {
      action: "ARCHIVE_DOWNLOAD",
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      detail: true,
      user: {
        select: { name: true, email: true },
      },
    },
  });

  return logs.map((log) => ({
    id: log.id,
    createdAt: log.createdAt,
    user: log.user?.name ?? "Sistema",
    userEmail: log.user?.email ?? "",
    detail: log.detail,
  }));
}
