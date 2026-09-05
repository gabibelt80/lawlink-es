"use server";

/**
 * v0.22: Archivos del estudio (FirmFile)
 *
 * Compartidos en todo el estudio: todos los usuarios activos pueden leer;
 * admin / PRINCIPAL_LAWYER pueden subir / reemplazar / eliminar.
 * 4 categorias: normativa / guias / plantillas de referencia / otros.
 * Versiones: supersededById enlaza version anterior a nueva.
 */
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { storage } from "@/lib/storage";
import { sha256 } from "@/lib/storage/crypto";
import { ensureExt } from "@/lib/storage/mime-ext";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import type { FirmFileCategory, Prisma } from "@prisma/client";

const FIRM_FILE_MAX_BYTES = 50 * 1024 * 1024;

export type FirmFileEntry = {
  id: string;
  name: string;
  description: string | null;
  category: FirmFileCategory;
  tags: string[];
  mimeType: string | null;
  size: number;
  uploadedBy: { id: string; name: string };
  createdAt: Date;
  hasNewerVersion: boolean;
  supersedesCount: number;
};

async function requireUploader() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("Solo el Administrador / Abogado Principal puede administrar archivos del estudio");
  }
  return session;
}

const CATEGORY_VALUES: FirmFileCategory[] = ["POLICY", "GUIDE", "TEMPLATE", "REFERENCE"];

function parseCategory(raw: unknown): FirmFileCategory {
  if (typeof raw !== "string") throw new Error("La categoria es obligatoria");
  if ((CATEGORY_VALUES as string[]).includes(raw)) return raw as FirmFileCategory;
  throw new Error(`Categoria invalida: ${raw}`);
}

function parseTags(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  return raw
    .split(/[,，、\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export async function listFirmFiles(input: {
  category?: FirmFileCategory;
  search?: string;
  includeSuperseded?: boolean;
}): Promise<FirmFileEntry[]> {
  const prisma = await getTenantPrisma();
  await requireSession();

  const where: Prisma.FirmFileWhereInput = {
    archivedAt: null
  };
  if (input.category) where.category = input.category;
  if (!input.includeSuperseded) where.supersedes = { none: {} };

  if (input.search?.trim()) {
    const q = input.search.trim();
    where.OR = [
      { name: { contains: q } },
      { description: { contains: q } },
      { tags: { array_contains: q } }
    ];
  }

  const rows = await prisma.firmFile.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      tags: true,
      mimeType: true,
      size: true,
      createdAt: true,
      supersededById: true,
      uploadedBy: { select: { id: true, name: true } },
      _count: { select: { supersedes: true } }
    }
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    tags: r.tags,
    mimeType: r.mimeType,
    size: r.size,
    uploadedBy: r.uploadedBy,
    createdAt: r.createdAt,
    hasNewerVersion: !!r.supersededById,
    supersedesCount: r._count.supersedes
  }));
}

export async function getFirmFileVersionHistory(input: { id: string }) {
  const prisma = await getTenantPrisma();
  await requireSession();
  type Node = {
    id: string;
    name: string;
    createdAt: Date;
    uploadedBy: { name: string };
    supersedes: { id: string }[];
  };
  const chain: Omit<Node, "supersedes">[] = [];
  let cursorId: string | null = input.id;
  while (cursorId) {
    const node: Node | null = await prisma.firmFile.findUnique({
      where: { id: cursorId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        uploadedBy: { select: { name: true } },
        supersedes: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true }
        }
      }
    });
    if (!node) break;
    chain.push({
      id: node.id,
      name: node.name,
      createdAt: node.createdAt,
      uploadedBy: node.uploadedBy
    });
    cursorId = node.supersedes[0]?.id ?? null;
  }
  return chain;
}

export async function uploadFirmFile(formData: FormData): Promise<{
  ok: true;
  id: string;
  name: string;
}> {
  const prisma = await getTenantPrisma();
  const session = await requireUploader();

  const file = formData.get("file");
  const name = formData.get("name");
  const description = formData.get("description");
  const category = parseCategory(formData.get("category"));
  const tags = parseTags(formData.get("tags"));
  const supersedesRaw = formData.get("supersedesId");

  if (!(file instanceof File)) throw new Error("Falta el archivo");
  if (file.size === 0) throw new Error("El archivo esta vacio");
  if (file.size > FIRM_FILE_MAX_BYTES)
    throw new Error(`El archivo supera los ${Math.round(FIRM_FILE_MAX_BYTES / 1024 / 1024)}MB`);
  if (typeof name !== "string" || !name.trim()) throw new Error("El nombre es obligatorio");

  const supersedesId =
    typeof supersedesRaw === "string" && supersedesRaw ? supersedesRaw : null;

  // Validacion de reemplazo de version anterior
  if (supersedesId) {
    const old = await prisma.firmFile.findUnique({
      where: { id: supersedesId },
      select: { id: true, supersededById: true, archivedAt: true }
    });
    if (!old) throw new Error("La version anterior no existe");
    if (old.supersededById) throw new Error("La version anterior ya fue reemplazada");
    if (old.archivedAt) throw new Error("La version anterior esta eliminada");
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const path = await storage.writeFile("firm-files", buf);
  const hash = sha256(buf);

  // Asegura que el nombre tenga extension
  const trimmedName = name.trim().slice(0, 200);
  const userHasExt = /\.[A-Za-z0-9]{1,5}$/.test(trimmedName);
  let nameWithFileExt = trimmedName;
  if (!userHasExt) {
    const m = file.name.match(/\.[A-Za-z0-9]{1,5}$/);
    nameWithFileExt = m ? trimmedName + m[0] : ensureExt(trimmedName, file.type || null);
  }

  const created = await prisma.$transaction(async (tx) => {
    const doc = await tx.firmFile.create({
      data: {
        name: nameWithFileExt,
        description:
          typeof description === "string" && description.trim()
            ? description.trim().slice(0, 1000)
            : null,
        category,
        tags,
        path,
        mimeType: file.type || null,
        size: file.size,
        sha256: hash,
        uploadedById: session.user.id
      },
      select: { id: true, name: true }
    });
    if (supersedesId) {
      await tx.firmFile.update({
        where: { id: supersedesId },
        data: { supersededById: doc.id }
      });
    }
    return doc;
  });

  await audit({
    userId: session.user.id,
    action: supersedesId ? "FIRM_FILE_REPLACE" : "FIRM_FILE_UPLOAD",
    targetType: "FirmFile",
    targetId: created.id,
    detail: { name: created.name, category, supersededId: supersedesId }
  });

  revalidatePath("/firm-resources");
  return { ok: true, id: created.id, name: created.name };
}

export async function updateFirmFile(input: {
  id: string;
  name?: string;
  description?: string | null;
  tags?: string[];
  category?: FirmFileCategory;
}) {
  const prisma = await getTenantPrisma();
  const session = await requireUploader();
  const existing = await prisma.firmFile.findUnique({
    where: { id: input.id },
    select: { id: true, archivedAt: true }
  });
  if (!existing) throw new Error("El archivo no existe");
  if (existing.archivedAt) throw new Error("No se puede editar un archivo eliminado");

  const data: Prisma.FirmFileUpdateInput = {};
  if (input.name !== undefined) data.name = input.name.trim().slice(0, 200);
  if (input.description !== undefined) {
    data.description = input.description?.trim().slice(0, 1000) || null;
  }
  if (input.tags !== undefined) data.tags = input.tags.slice(0, 20);
  if (input.category !== undefined) data.category = input.category;

  await prisma.firmFile.update({ where: { id: input.id }, data });
  await audit({
    userId: session.user.id,
    action: "FIRM_FILE_UPDATE",
    targetType: "FirmFile",
    targetId: input.id,
    detail: input
  });
  revalidatePath("/firm-resources");
  return { ok: true };
}

export async function deleteFirmFile(input: { id: string }) {
  const prisma = await getTenantPrisma();
  const session = await requireUploader();
  await prisma.firmFile.update({
    where: { id: input.id },
    data: { archivedAt: new Date() }
  });
  await audit({
    userId: session.user.id,
    action: "FIRM_FILE_DELETE",
    targetType: "FirmFile",
    targetId: input.id,
    detail: {}
  });
  revalidatePath("/firm-resources");
  return { ok: true };
}