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
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(50),
  stage: z.string().min(1).max(50),
  content: z.string().min(1).max(50000),
  enabled: z.boolean().default(true),
});

export async function listWritings() {
  const prisma = await getTenantPrisma();
  await requireSession();
  return prisma.writingTemplate.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
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
    data: { ...data, createdById: session.user.id },
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

  const WRITINGS_DIR = process.env.APP_STORAGE_DIR
    ? join(process.env.APP_STORAGE_DIR, "writings")
    : join(process.cwd(), "storage", "writings");

  const SUPPORTED_EXTENSIONS = new Set([".txt", ".docx", ".pdf", ".doc"]);

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
          data: { content },
        });
        updated++;
      } else {
        await prisma.writingTemplate.create({
          data: {
            name,
            category: "OTRO",
            stage: "TODAS",
            content,
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

  // Resolver matterId: puede ser cuid o internalCode
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

  // Si la etapa no existe en la base de datos, crearla
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

  // Crear carpeta del caso si no existe (usando internalCode)
  const matterDir = join(process.cwd(), "storage", "matters", matter.internalCode);
  mkdirSync(matterDir, { recursive: true });

  // Guardar el archivo
  const fileName = `${Date.now()}-${input.name.replace(/[^a-zA-Z0-9]/g, "_")}.html`;
  const filePath = join(matterDir, fileName);
  writeFileSync(filePath, input.content, "utf-8");

  const created = await prisma.document.create({
    data: {
      matterId: actualMatterId,
      procedureId: input.procedureId,
      stageId: finalStageId,
      name: input.name,
      category: "PLEADING",
      status: "DRAFT",
      path: filePath,
      mimeType: "text/html",
      size: Buffer.byteLength(input.content, "utf-8"),
      tags: JSON.stringify([`etapa:${input.stageName}`]),
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
  const { readFileSync, existsSync } = await import("node:fs");

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, path: true, name: true }
  });
  if (!doc) throw new Error("Documento no encontrado");

  let content = "";
  if (doc.path && existsSync(doc.path)) {
    content = readFileSync(doc.path, "utf-8");
  }

  return { content, name: doc.name };
}

export async function updateDocumentContent(input: {
  documentId: string;
  name: string;
  content: string;
}) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const { writeFileSync, mkdirSync } = await import("node:fs");
  const { join } = await import("node:path");

  const doc = await prisma.document.findUnique({
    where: { id: input.documentId },
    select: { id: true, matterId: true, path: true }
  });
  if (!doc) throw new Error("Documento no encontrado");

  // Si no hay path, crear uno
  let filePath = doc.path;
  if (!filePath) {
    const matter = await prisma.matter.findUnique({
      where: { id: doc.matterId! },
      select: { internalCode: true }
    });
    if (!matter) throw new Error("Caso no encontrado");
    const matterDir = join(process.cwd(), "storage", "matters", matter.internalCode);
    mkdirSync(matterDir, { recursive: true });
    filePath = join(matterDir, `${Date.now()}-${input.name.replace(/[^a-zA-Z0-9]/g, "_")}.html`);
  }

  // Guardar el archivo
  writeFileSync(filePath, input.content, "utf-8");

  await prisma.document.update({
    where: { id: input.documentId },
    data: {
      name: input.name,
      path: filePath,
      size: Buffer.byteLength(input.content, "utf-8"),
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

  return { ok: true, path: filePath };
}