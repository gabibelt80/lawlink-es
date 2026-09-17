/**
 * v0.8 seed: 8 plantillas de documentos integradas + 5 configuraciones de sellos
 *
 * Estrategia idempotente:
 *   - DocumentTemplate: usa (name + isBuiltIn=true) como clave logica con findFirst,
 *     solo crea si no existe. Re-ejecutar no sobreescribe.
 *   - SealTypeConfig: usa type como @id, hace upsert.
 *
 * El Buffer docx de la plantilla se construye dinamicamente en
 * src/lib/template-builder.ts, se encripta y se guarda como Document(encrypted=true).
 */
import type { PrismaClient } from "@prisma/client";
import { BUILTIN_TEMPLATES } from "../../src/lib/template-builder";
import { V1_TEMPLATES } from "../../src/lib/template-builder-v1";
import { writeFile } from "../../src/lib/storage/local";
import { encryptBuffer, sha256 } from "../../src/lib/storage/crypto";

export async function seedV08Templates(prisma: PrismaClient) {
  // Buscar un ADMIN como uploadedBy
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (!admin) {
    console.log(
      "AVISO: se omite seed de plantillas v0.8. No se encontro usuario ADMIN"
    );
    return;
  }

  let created = 0;
  let skipped = 0;
  // v1.0 P3: primer lote de 10 + segundo lote de 12 (objetivo PRD 11.3: 20+)
  for (const tmpl of [...BUILTIN_TEMPLATES, ...V1_TEMPLATES]) {
    const existing = await prisma.documentTemplate.findFirst({
      where: { name: tmpl.name, isBuiltIn: true },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const buf = await tmpl.buildBuffer();
    const enc = encryptBuffer(buf);
    const path = await writeFile("templates", enc.ciphertext);

    const doc = await prisma.document.create({
      data: {
        name: `${tmpl.name}.docx`,
        category: "OTHER",
        path,
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size: buf.length,
        sha256: sha256(buf),
        encrypted: true,
        algorithm: enc.algorithm,
        iv: enc.iv.toString("base64"),
        authTag: enc.authTag.toString("base64"),
        tags: ["plantilla integrada"],
        uploadedById: admin.id,
      },
    });

    await prisma.documentTemplate.create({
      data: {
        name: tmpl.name,
        category: tmpl.category,
        description: tmpl.description,
        applicableCategories: tmpl.applicableCategories,
        docxBlobId: doc.id,
        variables: tmpl.variables,
        isBuiltIn: true,
        enabled: true,
        createdById: admin.id,
      },
    });
    created++;
  }
  console.log(
    `OK v0.8 plantillas: ${created} creadas / ${skipped} existentes`
  );
}

export async function seedV08SealConfigs(prisma: PrismaClient) {
  const configs = [
    {
      type: "OFFICIAL_SEAL" as const,
      label: "Sello oficial del estudio",
      description:
        "Para dictamenes legales, cartas del estudio, cartas documento y documentos formales externos.",
      approverRoles: ["PRINCIPAL_LAWYER" as const],
      requiresLegalRep: false,
    },
    {
      type: "CONTRACT_SEAL" as const,
      label: "Sello de contratos",
      description:
        "Contratos que firma el estudio hacia afuera (consultoria, derivaciones, etc.).",
      approverRoles: ["PRINCIPAL_LAWYER" as const],
      requiresLegalRep: false,
    },
    {
      type: "FINANCE_SEAL" as const,
      label: "Sello de finanzas",
      description:
        "Facturas, recibos, conciliaciones bancarias y otros documentos financieros.",
      approverRoles: ["FINANCE" as const],
      requiresLegalRep: false,
    },
    {
      type: "LEGAL_REP_SEAL" as const,
      label: "Sello del representante legal",
      description:
        "Registros societarios, documentacion bancaria. Solo el representante legal puede aprobar.",
      approverRoles: [],
      requiresLegalRep: true,
    },
    {
      type: "CONTRACT_REVIEW_SEAL" as const,
      label: "Sello de revision de contratos",
      description:
        "Contratos enviados por clientes de asesoria para su revision.",
      approverRoles: ["PRINCIPAL_LAWYER" as const],
      requiresLegalRep: false,
    },
  ];

  for (const c of configs) {
    await prisma.sealTypeConfig.upsert({
      where: { type: c.type },
      update: {
        label: c.label,
        description: c.description,
        approverRoles: c.approverRoles,
        requiresLegalRep: c.requiresLegalRep,
      },
      create: c,
    });
  }
  console.log(`OK v0.8 configuracion de sellos: ${configs.length} listas`);
}