"use server";

import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";

import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { seedDefaultFolders } from "@/lib/default-folders";
import { generateInternalCode, generateFirmCaseNo } from "@/server/matters/code-generator";
import { generateClientCode } from "@/server/clients/code-generator";
import { assertCauseAllowedForSelection } from "@/server/causes/validation";
import {
  IMPORT_COLUMNS,
  validateRow,
  buildMatterTitle,
  firstProcedureTypeFor,
  type RawRow,
  type NormalizedRow
} from "@/lib/imports/matter-import";

async function requireManager() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("Solo el Administrador / Abogado Principal puede importar casos");
  }
  return session;
}

/** Convierte valor de celda Excel a string */
function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "object") {
    const obj = value as { result?: unknown; text?: unknown; richText?: { text: string }[] };
    if (obj.richText) return obj.richText.map((r) => r.text).join("");
    if (obj.text !== undefined) return String(obj.text);
    if (obj.result !== undefined) return String(obj.result);
    return "";
  }
  return String(value).trim();
}

/** Lee el xlsx subido y devuelve filas */
async function readSheet(file: File): Promise<{ rowNo: number; raw: RawRow }[]> {
  const buf = Buffer.from(await file.arrayBuffer());
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const sheet = wb.worksheets[0];
  if (!sheet) throw new Error("El archivo no tiene hoja de trabajo");

  const headerByIndex = new Map<number, string>();
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    const text = cellToString(cell.value).replace(/\*$/, "").trim();
    const col = IMPORT_COLUMNS.find((c) => c.header === text);
    if (col) headerByIndex.set(colNumber, col.key);
  });
  if (headerByIndex.size === 0) {
    throw new Error("No se reconocieron los encabezados, use la plantilla descargada");
  }

  const rows: { rowNo: number; raw: RawRow }[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const raw: RawRow = {};
    let hasAny = false;
    for (const [colIndex, key] of headerByIndex) {
      const v = cellToString(row.getCell(colIndex).value);
      if (v) hasAny = true;
      raw[key] = v;
    }
    if (hasAny) rows.push({ rowNo: r, raw });
  }
  return rows;
}

export interface ImportPreviewRow {
  rowNo: number;
  raw: RawRow;
  errors: string[];
  valid: boolean;
}

export interface ImportPreview {
  columns: { key: string; header: string; required: boolean }[];
  rows: ImportPreviewRow[];
  total: number;
  validCount: number;
}

/** Parsea y valida (sin escribir en la base) */
export async function parseMatterImportAction(formData: FormData): Promise<ImportPreview> {
  const prisma = await getTenantPrisma();
  await requireManager();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Falta el archivo");

  const parsed = await readSheet(file);
  if (parsed.length === 0) {
    throw new Error("No se leyeron filas de datos. Complete desde la fila 2 de la plantilla");
  }

  const emails = [
    ...new Set(parsed.map((p) => (p.raw.ownerEmail ?? "").trim().toLowerCase()).filter(Boolean))
  ];
  const lawyers = emails.length
    ? await prisma.user.findMany({ where: { email: { in: emails } }, select: { email: true } })
    : [];
  const knownEmails = new Set(lawyers.map((l) => l.email.toLowerCase()));

  const rows: ImportPreviewRow[] = parsed.map(({ rowNo, raw }) => {
    const { errors, normalized } = validateRow(raw);
    const errs = [...errors];
    if (normalized?.ownerEmail && !knownEmails.has(normalized.ownerEmail.toLowerCase())) {
      errs.push(`El email del abogado a cargo "${normalized.ownerEmail}" no coincide con ningun usuario`);
    }
    return { rowNo, raw, errors: errs, valid: errs.length === 0 };
  });

  return {
    columns: IMPORT_COLUMNS.map((c) => ({ key: c.key, header: c.header, required: c.required })),
    rows,
    total: rows.length,
    validCount: rows.filter((r) => r.valid).length
  };
}

/** Crea un Caso desde fila normalizada */
async function createOneMatter(n: NormalizedRow, currentUserId: string) {
  const prisma = await getTenantPrisma();

  // Abogado a cargo
  let ownerId = currentUserId;
  if (n.ownerEmail) {
    const lawyer = await prisma.user.findFirst({
      where: { email: { equals: n.ownerEmail } },
      select: { id: true }
    });
    if (!lawyer) throw new Error(`El email del abogado a cargo "${n.ownerEmail}" no coincide con ningun usuario`);
    ownerId = lawyer.id;
  }

  // Causa: coincidencia exacta o texto libre
  let causeId: string | null = null;
  let causeFreeText: string | null = null;
  let causeDowngradeReason: string | null = null;
  if (n.causeText) {
    const cause = await prisma.causeOfAction.findFirst({
      where: { name: n.causeText },
      select: { id: true }
    });
    if (cause) causeId = cause.id;
    else causeFreeText = n.causeText;
  }

  // Validacion de causa
  if (causeId) {
    try {
      await assertCauseAllowedForSelection({
        causeId,
        category: n.category,
        procedureType: firstProcedureTypeFor(n.category)
      });
    } catch (e) {
      causeDowngradeReason = e instanceof Error ? e.message : "La causa no coincide con la categoria del caso";
      causeFreeText = n.causeText ?? null;
      causeId = null;
    }
  }

  const internalCode = await generateInternalCode(n.category);
  const firmCaseNo = await generateFirmCaseNo(n.category);

  // find-or-create Cliente
  const existingClient = await prisma.client.findFirst({
    where: { name: n.clientName, idNumber: n.clientIdNumber, deletedAt: null },
    select: { id: true }
  });
  const clientCode = existingClient ? null : await generateClientCode();

  const title = buildMatterTitle(n.clientName, n.opposingName, n.causeText);
  const intakeDate = n.intakeDate ?? new Date();

  const clientParty = {
    role: "CLIENT_PARTY" as const,
    ordinal: 1,
    name: n.clientName,
    partyType: n.clientPartyType,
    idNumber: n.clientIdNumber,
    phone: n.clientPhone,
    ...(n.clientPartyType !== "NATURAL_PERSON"
      ? { enterpriseSocialCode: n.clientIdNumber, enterpriseName: n.clientName }
      : {})
  };
  const opposingParty = {
    role: "OPPOSING_PARTY" as const,
    ordinal: 1,
    name: n.opposingName,
    partyType: n.opposingPartyType,
    idNumber: n.opposingIdNumber,
    ...(n.opposingPartyType !== "NATURAL_PERSON"
      ? { enterpriseSocialCode: n.opposingIdNumber, enterpriseName: n.opposingName }
      : {})
  };

  const result = await prisma.$transaction(async (tx) => {
    const clientId =
      existingClient?.id ??
      (
        await tx.client.create({
          data: {
            name: n.clientName,
            type: n.clientType,
            idNumber: n.clientIdNumber,
            phone: n.clientPhone,
            internalCode: clientCode
          },
          select: { id: true }
        })
      ).id;

    const matter = await tx.matter.create({
      data: {
        internalCode,
        firmCaseNo,
        title,
        category: n.category,
        status: n.status,
        ownerId,
        intakeDate,
        claimAmount: n.claimAmount ?? undefined,
        causeId,
        causeFreeText,
        closedAt: n.status === "CLOSED" ? new Date() : null,
        archivedAt: n.status === "ARCHIVED" ? new Date() : null,
        primaryClientId: clientId,
        members: { create: { userId: ownerId, role: "LEAD" } },
        clientLinks: { create: { clientId, isPrimary: true, label: "Cliente principal" } },
        parties: { create: [clientParty, opposingParty] },
        ...(n.status === "IN_PROGRESS"
          ? {
              procedures: {
                create: {
                  type: firstProcedureTypeFor(n.category),
                  engagement: "ENGAGED",
                  order: 1,
                  status: "IN_PROGRESS",
                  jurisdiction: n.jurisdiction
                }
              },
              firstAcceptedAt: intakeDate
            }
          : {})
      },
      select: { id: true, internalCode: true, firmCaseNo: true, title: true }
    });

    await tx.timelineEvent.create({
      data: {
        matterId: matter.id,
        eventType: "MATTER_CREATED",
        title: "Caso creado (importacion masiva)",
        occurredAt: new Date()
      }
    });

    await seedDefaultFolders(tx, matter.id, n.category);
    return matter;
  });

  return { ...result, causeDowngradeReason };
}

export interface ImportResult {
  succeeded: {
    rowNo: number;
    internalCode: string;
    firmCaseNo: string | null;
    title: string;
    causeDowngradeReason?: string;
  }[];
  failed: { rowNo: number; error: string }[];
}

/** Confirma importacion: fila por fila, los errores no detienen el proceso */
export async function commitMatterImportAction(input: {
  rows: { rowNo: number; raw: RawRow }[];
}): Promise<ImportResult> {
  const session = await requireManager();
  const succeeded: ImportResult["succeeded"] = [];
  const failed: ImportResult["failed"] = [];

  for (const { rowNo, raw } of input.rows) {
    try {
      const { errors, normalized } = validateRow(raw);
      if (!normalized) throw new Error(errors.join("; ") || "Error de validacion de fila");
      const m = await createOneMatter(normalized, session.user.id);
      succeeded.push({
        rowNo,
        internalCode: m.internalCode,
        firmCaseNo: m.firmCaseNo,
        title: m.title,
        ...(m.causeDowngradeReason ? { causeDowngradeReason: m.causeDowngradeReason } : {})
      });
    } catch (e) {
      failed.push({ rowNo, error: e instanceof Error ? e.message : "Error de importacion" });
    }
  }

  await audit({
    userId: session.user.id,
    action: "MATTER_IMPORT",
    targetType: "Matter",
    detail: {
      succeeded: succeeded.length,
      failed: failed.length,
      causeDowngraded: succeeded.filter((r) => r.causeDowngradeReason).length
    }
  });

  revalidatePath("/matters");
  return { succeeded, failed };
}