"use server";

import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";

import { prisma } from "@/lib/prisma";
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
    throw new Error("仅Administrar员 / 主任Abogado可批量导入Caso");
  }
  return session;
}

/** Excel 单pesos格值 → 字符串（Fecha统一格式化为 YYYY-MM-DD） */
function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "object") {
    // 富文本 / 公式结果
    const obj = value as { result?: unknown; text?: unknown; richText?: { text: string }[] };
    if (obj.richText) return obj.richText.map((r) => r.text).join("");
    if (obj.text !== undefined) return String(obj.text);
    if (obj.result !== undefined) return String(obj.result);
    return "";
  }
  return String(value).trim();
}

/** 解析上传的 xlsx → [{ rowNo, raw }]，rowNo 为 Excel 行号（含表头，从 2 起） */
async function readSheet(file: File): Promise<{ rowNo: number; raw: RawRow }[]> {
  const buf = Buffer.from(await file.arrayBuffer());
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const sheet = wb.worksheets[0];
  if (!sheet) throw new Error("文件中没有工作表");

  // 表头 → 列索引（去掉必填星号，Coincidencia IMPORT_COLUMNS.header）
  const headerByIndex = new Map<number, string>(); // colIndex → field key
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    const text = cellToString(cell.value).replace(/\*$/, "").trim();
    const col = IMPORT_COLUMNS.find((c) => c.header === text);
    if (col) headerByIndex.set(colNumber, col.key);
  });
  if (headerByIndex.size === 0) {
    throw new Error("未识别到表头，请使用下载的模板填写");
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

/** 解析 + 校验（不写库），Volver预览表 */
export async function parseMatterImportAction(formData: FormData): Promise<ImportPreview> {
  await requireManager();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("缺少文件");

  const parsed = await readSheet(file);
  if (parsed.length === 0) {
    throw new Error("未读取到数据行（请在模板第 2 行起填写，并Eliminar示例行）");
  }

  // 预取主办AbogadoEmail，用于校验
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
      errs.push(`主办AbogadoEmail「${normalized.ownerEmail}」未Coincidencia到用户`);
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

/** 落库单行：find-or-create Cliente → 建Caso(+编号+主办+当事人+首程序+卷宗) */
async function createOneMatter(n: NormalizedRow, currentUserId: string) {
  // 主办Abogado
  let ownerId = currentUserId;
  if (n.ownerEmail) {
    const lawyer = await prisma.user.findFirst({
      where: { email: { equals: n.ownerEmail, mode: "insensitive" } },
      select: { id: true }
    });
    if (!lawyer) throw new Error(`主办AbogadoEmail「${n.ownerEmail}」未Coincidencia到用户`);
    ownerId = lawyer.id;
  }

  // Causa：精确CoincidenciaCausa库，否则作为自由文本
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

  // v1.2：导入曾是唯一绕过Causa校验的写入路径，能造出界面Crear不出来的组合
  // （如劳动仲裁Caso挂婚姻家庭类Causa）。校验基准yCrearCaso一致：类别 + 首程序类型。
  //
  // 不合规时降级为自由文本、不整行Error：导入是历史数据迁移工具，历史Caso按当时
  // 规则立的Causa未必符合现行范围，为一个Causa把整条Caso挡在门外代价过大。
  // 自由文本字段本就不参y联动校验，信息不丢，降级情况在导入结果里逐行列出。
  if (causeId) {
    try {
      await assertCauseAllowedForSelection({
        causeId,
        category: n.category,
        procedureType: firstProcedureTypeFor(n.category)
      });
    } catch (e) {
      causeDowngradeReason = e instanceof Error ? e.message : "CausayCaso类别不Coincidencia";
      causeFreeText = n.causeText ?? null;
      causeId = null;
    }
  }

  const internalCode = await generateInternalCode(n.category);
  const firmCaseNo = await generateFirmCaseNo(n.category);

  // find-or-create Cliente（Nombre + 证件号）
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
        clientLinks: { create: { clientId, isPrimary: true, label: "主要委托方" } },
        parties: { create: [clientParty, opposingParty] },
        // 办理中按类别自动生成首程序（y收案转化一致）；Cerrar caso/归档不建
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
        title: "Caso已Crear（批量导入）",
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
    /** CausayCaso类别不Coincidencia、已降级为自由文本；需事后人工核对 */
    causeDowngradeReason?: string;
  }[];
  failed: { rowNo: number; error: string }[];
}

/** Confirmar导入：逐行事务、Error不阻断，Volver成功/Error清单 */
export async function commitMatterImportAction(input: {
  rows: { rowNo: number; raw: RawRow }[];
}): Promise<ImportResult> {
  const session = await requireManager();
  const succeeded: ImportResult["succeeded"] = [];
  const failed: ImportResult["failed"] = [];

  for (const { rowNo, raw } of input.rows) {
    try {
      const { errors, normalized } = validateRow(raw);
      if (!normalized) throw new Error(errors.join("；") || "行校验Error");
      const m = await createOneMatter(normalized, session.user.id);
      succeeded.push({
        rowNo,
        internalCode: m.internalCode,
        firmCaseNo: m.firmCaseNo,
        title: m.title,
        ...(m.causeDowngradeReason ? { causeDowngradeReason: m.causeDowngradeReason } : {})
      });
    } catch (e) {
      failed.push({ rowNo, error: e instanceof Error ? e.message : "导入Error" });
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
