"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { logCaseWriting, logCaseEvent } from "@/server/matters/case-logger";
import { extractTextFromFile } from "@/lib/writings/extract-text";

const writingSchema = z.object({
  name: z.string().max(200).optional(),
  category: z.string().max(50).optional(),
  stage: z.string().max(50).optional(),
  content: z.string().max(50000).optional(),
  enabled: z.boolean().default(true),
});

function toRelativePath(absPath: string, storageRoot: string): string {
  return absPath
    .replace(storageRoot, "")
    .replace(/\\/g, "/")
    .replace(/^\//, "");
}

export async function listWritings(search?: string) {
  const prisma = await getTenantPrisma();
  await requireSession();
  return prisma.writingTemplate.findMany({
    where: search ? {
      OR: [
        { name: { contains: search } },
        { content: { contains: search } },
      ]
    } : undefined,
    orderBy: [{ category: "asc" }, { name: "asc" }],
    take: 200,
  });
}

export async function createWriting(input: z.infer<typeof writingSchema>) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("Solo el Administrador o Abogado Principal puede crear escritos");
  }
  const data = writingSchema.parse(input);
  const created = await prisma.writingTemplate.create({
    data: {
      name: data.name ?? "Sin título",
      category: data.category ?? "OTRO",
      stage: data.stage ?? "TODAS",
      content: data.content ?? "",
      enabled: data.enabled,
      createdById: session.user.id,
    },
  });
  revalidatePath("/settings/writings");
  return { ok: true, id: created.id };
}

export async function updateWriting(id: string, input: z.infer<typeof writingSchema>) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("Solo el Administrador o Abogado Principal puede editar escritos");
  }
  const data = writingSchema.parse(input);
  await prisma.writingTemplate.update({
    where: { id },
    data,
  });
  revalidatePath("/settings/writings");
  return { ok: true };
}

export async function deleteWriting(id: string) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("Solo el Administrador o Abogado Principal puede eliminar escritos");
  }
  await prisma.writingTemplate.delete({ where: { id } });
  revalidatePath("/settings/writings");
  return { ok: true };
}

export async function syncWritingsFromFolder() {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("Solo el Administrador o Abogado Principal puede sincronizar escritos");
  }

  const WRITINGS_DIR = join(process.cwd(), "escritos");
  const SUPPORTED_EXTENSIONS = new Set([".txt", ".docx"]);

  const files = readdirSync(WRITINGS_DIR);
  const supportedFiles = files.filter((file) => {
    const ext = file.toLowerCase().slice(file.lastIndexOf("."));
    return SUPPORTED_EXTENSIONS.has(ext);
  });

  const existing = await prisma.writingTemplate.findMany({
    select: { name: true },
  });
  const existingNames = new Set(existing.map((w) => w.name));

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const file of supportedFiles) {
    const fullPath = join(WRITINGS_DIR, file);
    const name = file.replace(/\.[^.]+$/, "");

    try {
      const content = await extractTextFromFile(fullPath);

      if (existingNames.has(name)) {
        await prisma.writingTemplate.updateMany({
          where: { name },
          data: { content, docxPath: fullPath },
        });
        updated++;
      } else {
        await prisma.writingTemplate.create({
          data: {
            name,
            category: "OTRO",
            stage: "TODAS",
            content,
            docxPath: fullPath,
            enabled: true,
            createdById: session.user.id,
          },
        });
        created++;
      }
    } catch (err) {
      errors.push(`${file}: ${err instanceof Error ? err.message : "Error desconocido"}`);
    }
  }

  revalidatePath("/settings/writings");

  return {
    ok: true,
    total: supportedFiles.length,
    created,
    updated,
    errors,
  };
}

export async function saveWritingToMatter(input: {
  matterId: string;
  procedureId: string;
  stageId: string | null;
  stageName: string;
  name: string;
  content: string;
  writingTemplateId: string;
}) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const { writeFileSync, mkdirSync } = await import("node:fs");
  const { join } = await import("node:path");

  const matter = await prisma.matter.findFirst({
    where: {
      OR: [
        { id: input.matterId },
        { internalCode: input.matterId },
        { firmCaseNo: input.matterId }
      ]
    },
    select: { id: true, internalCode: true }
  });
  if (!matter) throw new Error("Caso no encontrado");

  const actualMatterId = matter.id;
  let finalStageId = input.stageId;

  if (!finalStageId) {
    const { ensureProcedureStage } = await import("@/server/procedures/actions");
    const ensured = await ensureProcedureStage({
      procedureId: input.procedureId,
      name: input.stageName,
      description: "",
      insertPosition: "END"
    });
    finalStageId = ensured.id;
  }

  const { getStorageRoot } = await import("@/lib/storage/local");
  const { htmlToDocxBuffer } = await import("@/lib/writings/html-to-docx");
  const storageRoot = getStorageRoot();
  const matterDir = join(storageRoot, "matters", matter.internalCode);
  mkdirSync(matterDir, { recursive: true });

  const html = input.content;
  const docxBuffer = await htmlToDocxBuffer(html, input.name);
  const fileName = `${matter.internalCode}-${input.name.replace(/[^a-zA-Z0-9]/g, "_")}.docx`;
  const absPath = join(matterDir, fileName);
  writeFileSync(absPath, docxBuffer);

  const filePath = toRelativePath(absPath, storageRoot);

  const created = await prisma.document.create({
    data: {
      matterId: actualMatterId,
      procedureId: input.procedureId,
      stageId: finalStageId,
      name: input.name,
      category: "PLEADING",
      status: "DRAFT",
      path: filePath,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: docxBuffer.length,
      tags: [`etapa:${input.stageName}`],
      uploadedById: session.user.id,
      encrypted: false
    }
  });

  await logCaseWriting(actualMatterId, {
    id: created.id,
    name: input.name,
    content: input.content,
    status: "DRAFT",
  });

  await logCaseEvent(
    actualMatterId,
    "WRITING_SAVED",
    `Escrito guardado: ${input.name}`,
    null,
    { documentId: created.id, name: input.name }
  );

  return { ok: true, id: created.id };
}

export async function getDocumentContent(documentId: string) {
  const prisma = await getTenantPrisma();
  await requireSession();

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, path: true, name: true }
  });
  if (!doc) throw new Error("Documento no encontrado");

  let content = "";
  if (doc.path) {
    const { getStorageRoot } = await import("@/lib/storage/local");
    const { join } = await import("node:path");
    const { readFileSync, existsSync } = await import("node:fs");
    const absPath = join(getStorageRoot(), doc.path);

    if (existsSync(absPath)) {
      const ext = doc.path.toLowerCase().split(".").pop();
      if (ext === "docx") {
        const mammoth = await import("mammoth");
        const result = await mammoth.convertToHtml({ path: absPath });
        content = result.value;
      } else {
        content = readFileSync(absPath, "utf-8");
      }
    }
  }

  return { content, name: doc.name };
}

export async function updateDocumentContent(input: {
  documentId: string;
  name: string;
  content: string;
}) {
  const prisma = await getTenantPrisma();
  await requireSession();
  const { writeFileSync, mkdirSync } = await import("node:fs");
  const { join } = await import("node:path");

  const doc = await prisma.document.findUnique({
    where: { id: input.documentId },
    select: { id: true, matterId: true, path: true }
  });
  if (!doc) throw new Error("Documento no encontrado");

  const { getStorageRoot } = await import("@/lib/storage/local");
  const { htmlToDocxBuffer } = await import("@/lib/writings/html-to-docx");
  const storageRoot = getStorageRoot();

  let absPath: string;
  if (doc.path) {
    absPath = join(storageRoot, doc.path);
    // Si el path viejo era .html, convertir a .docx
    if (absPath.endsWith(".html")) {
      absPath = absPath.replace(/\.html$/, ".docx");
    }
  } else {
    const matter = await prisma.matter.findUnique({
      where: { id: doc.matterId! },
      select: { internalCode: true }
    });
    if (!matter) throw new Error("Caso no encontrado");
    const matterDir = join(storageRoot, "matters", matter.internalCode);
    mkdirSync(matterDir, { recursive: true });
    absPath = join(matterDir, `${matter.internalCode}-${input.name.replace(/[^a-zA-Z0-9]/g, "_")}.docx`);
  }

  const html = input.content;
  const docxBuffer = await htmlToDocxBuffer(html, input.name);
  writeFileSync(absPath, docxBuffer);

  const relPath = toRelativePath(absPath, storageRoot);

  await prisma.document.update({
    where: { id: input.documentId },
    data: {
      name: input.name,
      path: relPath,
      size: docxBuffer.length,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
  });

  if (doc.matterId) {
    const { logCaseWriting, logCaseEvent } = await import("@/server/matters/case-logger");
    await logCaseWriting(doc.matterId, {
      id: doc.id,
      name: input.name,
      content: input.content,
      status: "FILED",
    });
    await logCaseEvent(
      doc.matterId,
      "WRITING_UPDATED",
      `Escrito editado: ${input.name}`,
      null,
      { documentId: doc.id, name: input.name }
    );
  }

  return { ok: true, path: relPath };
}