"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { storage } from "@/lib/storage";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanLeadMatter } from "@/lib/permissions";
import { decryptBuffer, encryptBuffer, sha256 } from "@/lib/storage/crypto";
import { buildContext, renderDocxBuffer, detectMissing } from "@/lib/template-engine";
import { suggestFolderByTemplateCategory } from "@/lib/default-folders";
import {
  templateListFilterSchema,
  templateToggleSchema,
  templateRenderSchema
} from "./schemas";
import { revalidateMatter } from "@/server/matters/route";

export async function listTemplates(input?: z.input<typeof templateListFilterSchema>) {
  const prisma = await getTenantPrisma();
  await requireSession();
  const filter = templateListFilterSchema.parse(input ?? {});

  const where: Prisma.DocumentTemplateWhereInput = {};
  if (filter.onlyEnabled) where.enabled = true;
  if (filter.category) where.category = filter.category;
  if (filter.matterCategory) {
    // applicableCategories vacio = aplica a todos
    where.OR = [
      { applicableCategories: { equals: [] } },
      { applicableCategories: { array_contains: filter.matterCategory } }
    ];
  }

  return prisma.documentTemplate.findMany({
    where,
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      applicableCategories: true,
      variables: true,
      isBuiltIn: true,
      enabled: true,
      updatedAt: true
    }
  });
}

export async function getTemplate(id: string) {
  const prisma = await getTenantPrisma();
  await requireSession();
  return prisma.documentTemplate.findUnique({
    where: { id },
    include: {
      docxBlob: { select: { id: true, name: true, size: true } },
      createdBy: { select: { id: true, name: true } }
    }
  });
}

export async function toggleTemplate(input: z.infer<typeof templateToggleSchema>) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("Solo el Administrador puede habilitar/deshabilitar plantillas");
  }
  const data = templateToggleSchema.parse(input);

  await prisma.documentTemplate.update({
    where: { id: data.id },
    data: { enabled: data.enabled }
  });

  await audit({
    userId: session.user.id,
    action: "TEMPLATE_TOGGLE",
    targetType: "DocumentTemplate",
    targetId: data.id,
    detail: { enabled: data.enabled }
  });

  revalidatePath("/settings/templates");
  return { ok: true };
}

/**
 * Render de plantilla + archivo
 *   1. Valida entrada y permisos
 *   2. Lee y descifra plantilla docx
 *   3. Construye contexto
 *   4. Renderiza -> encripta -> guarda Document
 *   5. Devuelve documentId
 */
export async function renderTemplate(input: z.infer<typeof templateRenderSchema>) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const data = templateRenderSchema.parse(input);

  await assertMatterWritable(data.matterId);
  await assertCanLeadMatter(session.user.id, data.matterId, "Solo el responsable/co-responsable puede generar documentos");

  // Obtiene plantilla + docxBlob
  const tmpl = await prisma.documentTemplate.findUnique({
    where: { id: data.templateId },
    include: { docxBlob: true }
  });
  if (!tmpl || !tmpl.enabled) throw new Error("La plantilla no existe o esta deshabilitada");
  if (!tmpl.docxBlob) throw new Error("Falta el archivo fuente de la plantilla");

  // Verifica folder del mismo Caso
  if (data.folderId) {
    const folder = await prisma.documentFolder.findUnique({
      where: { id: data.folderId },
      select: { matterId: true }
    });
    if (!folder || folder.matterId !== data.matterId) {
      throw new Error("La carpeta destino y el Caso no coinciden");
    }
  }

  // Obtiene Caso + archivo fuente
  const matter = await prisma.matter.findUnique({
    where: { id: data.matterId },
    select: { internalCode: true, category: true }
  });
  if (!matter) throw new Error("El Caso no existe");

  const rawCt = await storage.readFile(tmpl.docxBlob.path);
  const templateBuffer = tmpl.docxBlob.encrypted
    ? decryptBuffer(rawCt, tmpl.docxBlob.iv ?? "", tmpl.docxBlob.authTag ?? "")
    : rawCt;

  // Contexto (aplicando overrides)
  const context = await buildContext({
    matterId: data.matterId,
    userId: session.user.id,
    overrides: data.overrides
  });

  // Detecta variables faltantes
  const required = Array.isArray(tmpl.variables) ? (tmpl.variables as string[]) : [];
  const missing = detectMissing(required, context);

  // Renderiza
  const renderedBuf = renderDocxBuffer(templateBuffer, context);
  const enc = encryptBuffer(renderedBuf);
  const path = await storage.writeFile(`m_${data.matterId}`, enc.ciphertext);

  // Si no se especifico folder, se recomienda por categoria de plantilla
  let folderId = data.folderId;
  if (!folderId) {
    const suggestedName = suggestFolderByTemplateCategory(tmpl.category, matter.category);
    if (suggestedName) {
      const f = await prisma.documentFolder.findFirst({
        where: { matterId: data.matterId, name: suggestedName },
        select: { id: true }
      });
      if (f) folderId = f.id;
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const fileName = `${tmpl.name}_${matter.internalCode}_${today}.docx`;

  const doc = await prisma.document.create({
    data: {
      matterId: data.matterId,
      folderId: folderId ?? undefined,
      templateId: tmpl.id,
      templateContextSnapshot: context as unknown as Prisma.InputJsonValue,
      name: fileName,
      category: "OTHER",
      path,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: renderedBuf.length,
      sha256: sha256(renderedBuf),
      encrypted: true,
      algorithm: enc.algorithm,
      iv: enc.iv.toString("base64"),
      authTag: enc.authTag.toString("base64"),
      tags: ["Generado por plantilla", tmpl.name],
      uploadedById: session.user.id
    }
  });

  await audit({
    userId: session.user.id,
    action: "TEMPLATE_RENDER",
    targetType: "Document",
    targetId: doc.id,
    detail: { templateId: tmpl.id, templateName: tmpl.name, matterId: data.matterId }
  });

  await revalidateMatter(data.matterId);
  return { ok: true, documentId: doc.id, fileName, missing };
}