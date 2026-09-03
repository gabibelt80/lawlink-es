import ExcelJS from "exceljs";
import {
  MatterCategory,
  Prisma,
  type LitigationStanding,
  type MatterMemberRole,
  type PartyRole,
  type PartyType,
  type ProcedureEngagement,
  type ProcedureOutcome,
  type ProcedureStatus
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { intakeVisibilityFilter, matterVisibilityFilter } from "@/lib/permissions";
import {
  barFilingLabel,
  clientTypeLabel,
  feeTypeLabel,
  intakeStatusLabel,
  litigationStandingLabel,
  matterCategoryLabel,
  matterCategoryKind,
  matterStatusLabel,
  partyTypeLabel,
  procedureTypeLabel
} from "@/lib/enums";

export type MattersExportTab = "intake" | "active" | "archived" | "revision" | "all";
type MatterSortBy = "hearing" | "intakeDate" | "claimAmount" | "archivedAt";
type MatterSortDir = "asc" | "desc";

export type MattersExportParams = {
  tab: MattersExportTab;
  search?: string;
  category?: MatterCategory;
  status?: string;
  from?: string;
  to?: string;
  sortBy: MatterSortBy;
  sortDir: MatterSortDir;
};

type ExportUser = {
  id: string;
  role: string;
};

const EXPORT_TABS: MattersExportTab[] = [
  "intake",
  "active",
  "archived",
  "revision",
  "all"
];

const TAB_LABEL: Record<MattersExportTab, string> = {
  all: "Ver todosCaso",
  intake: "å¾…AprobaciÃ³n",
  active: "è¿›è¡Œä¸­",
  revision: "Pendiente de correcciÃ³n",
  archived: "å·²å½’æ¡£"
};

const TAB_FILE_KEY: Record<MattersExportTab, string> = {
  all: "all",
  intake: "intake",
  active: "active",
  revision: "revision",
  archived: "archived"
};

const MATTER_CATEGORIES = Object.values(MatterCategory) as MatterCategory[];
type MatterCategoryKind = ReturnType<typeof matterCategoryKind>;

const intakeInclude = Prisma.validator<Prisma.IntakeInclude>()({
  client: {
    select: {
      id: true,
      name: true,
      type: true,
      idNumber: true,
      address: true,
      phone: true,
      legalRep: true,
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 3,
        select: { name: true, title: true, phone: true, email: true, isPrimary: true }
      }
    }
  },
  cause: { select: { name: true } },
  ownerUser: { select: { id: true, name: true } },
  parties: { orderBy: [{ role: "asc" }, { ordinal: "asc" }] },
  matter: { select: { id: true, internalCode: true, firmCaseNo: true, title: true } },
  documents: {
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { name: true, category: true, createdAt: true }
  }
});

const matterInclude = Prisma.validator<Prisma.MatterInclude>()({
  primaryClient: {
    select: {
      id: true,
      name: true,
      type: true,
      idNumber: true,
      address: true,
      phone: true,
      legalRep: true,
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 3,
        select: { name: true, title: true, phone: true, email: true, isPrimary: true }
      }
    }
  },
  clientLinks: {
    orderBy: { addedAt: "asc" },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          type: true,
          idNumber: true,
          address: true,
          phone: true,
          legalRep: true
        }
      }
    }
  },
  owner: { select: { id: true, name: true } },
  members: {
    orderBy: { joinedAt: "asc" },
    include: { user: { select: { id: true, name: true } } }
  },
  cause: { select: { name: true } },
  intake: { include: intakeInclude },
  parties: { orderBy: [{ role: "asc" }, { ordinal: "asc" }] },
  procedures: {
    orderBy: { order: "asc" },
    include: {
      leadLawyer: { select: { id: true, name: true } },
      procedureParties: {
        orderBy: [{ standing: "asc" }, { ordinal: "asc" }],
        include: { party: true }
      },
      hearings: {
        orderBy: { startsAt: "desc" },
        take: 1,
        select: { startsAt: true }
      }
    }
  },
  relatedEntities: {
    orderBy: { createdAt: "asc" },
    select: { name: true, relationship: true, notes: true }
  },
  linksFrom: {
    include: { relatedMatter: { select: { internalCode: true, firmCaseNo: true, title: true } } }
  },
  linksTo: {
    include: { matter: { select: { internalCode: true, firmCaseNo: true, title: true } } }
  },
  documents: {
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { name: true, category: true, createdAt: true }
  }
});

type IntakeExportRow = Prisma.IntakeGetPayload<{ include: typeof intakeInclude }>;
type MatterExportRow = Prisma.MatterGetPayload<{ include: typeof matterInclude }>;

const partyRoleLabel: Record<PartyRole, string> = {
  CLIENT_PARTY: "å§”æ‰˜æ–¹",
  OPPOSING_PARTY: "å¯¹æ–¹",
  THIRD_PARTY: "ç¬¬ä¸‰äºº",
  CO_LITIGANT: "å…±åŒå½“äº‹äºº",
  AGENT: "ä»£ç†äºº",
  WITNESS: "è¯äºº",
  OTHER: "å…¶ä»–"
};

const memberRoleLabel: Record<MatterMemberRole, string> = {
  LEAD: "ä¸»åŠž",
  CO_LEAD: "ååŠž",
  ASSISTANT: "åŠ©ç†"
};

const procedureStatusLabel: Record<ProcedureStatus, string> = {
  PENDING: "æœªå¼€å§‹",
  IN_PROGRESS: "è¿›è¡Œä¸­",
  CONCLUDED: "å·²ç»“æŸ"
};

const procedureEngagementLabel: Record<ProcedureEngagement, string> = {
  ENGAGED: "æ‰¿åŠž",
  INFORMATIONAL: "ä»…ç™»è®°"
};

const procedureOutcomeLabel: Record<ProcedureOutcome, string> = {
  WON: "èƒœè¯‰",
  PARTIAL_WON: "éƒ¨åˆ†èƒœè¯‰",
  LOST: "è´¥è¯‰",
  MEDIATED: "è°ƒè§£",
  WITHDRAWN: "æ’¤è¯‰",
  DISMISSED: "Rechazar",
  COMPLETED: "å®Œæˆ",
  TRANSFERRED: "ç§»é€",
  OTHER: "å…¶ä»–"
};

export function resolveMattersExportParams(searchParams: URLSearchParams): MattersExportParams {
  const rawTab = searchParams.get("tab");
  const tab = EXPORT_TABS.includes(rawTab as MattersExportTab)
    ? (rawTab as MattersExportTab)
    : "active";
  const rawSortBy = searchParams.get("sortBy");
  const candidateSortBy =
    rawSortBy === "hearing" ||
    rawSortBy === "intakeDate" ||
    rawSortBy === "claimAmount" ||
    rawSortBy === "archivedAt"
      ? rawSortBy
      : undefined;
  const sortBy = normalizeSortByForTab(tab, candidateSortBy ?? defaultSortByForTab(tab));
  const rawCategory = searchParams.get("category");
  const category = MATTER_CATEGORIES.includes(rawCategory as MatterCategory)
    ? (rawCategory as MatterCategory)
    : undefined;

  return {
    tab,
    search: cleanText(searchParams.get("search")),
    category,
    status: cleanText(searchParams.get("status")),
    from: cleanDateText(searchParams.get("from")),
    to: cleanDateText(searchParams.get("to")),
    sortBy,
    sortDir: searchParams.get("sortDir") === "asc" ? "asc" : "desc"
  };
}

export async function buildMattersExportWorkbook(
  params: MattersExportParams,
  user: ExportUser
): Promise<{ buffer: Buffer; filename: string; total: number; tabLabel: string }> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "LawLink";
  wb.created = new Date();

  const total =
    params.tab === "intake" || params.tab === "revision"
      ? await addIntakesSheet(wb, params, user)
      : await addMattersSheet(wb, params, user);

  const raw = await wb.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(raw),
    filename: buildFilename(params.tab),
    total,
    tabLabel: TAB_LABEL[params.tab]
  };
}

function defaultSortByForTab(tab: MattersExportTab): MatterSortBy {
  if (tab === "active") return "hearing";
  if (tab === "archived") return "archivedAt";
  return "intakeDate";
}

function normalizeSortByForTab(tab: MattersExportTab, sortBy: MatterSortBy): MatterSortBy {
  if (sortBy === "hearing" && tab !== "active" && tab !== "all") {
    return defaultSortByForTab(tab);
  }
  if (sortBy === "archivedAt" && tab !== "archived") {
    return defaultSortByForTab(tab);
  }
  if (sortBy === "claimAmount" && tab === "archived") {
    return defaultSortByForTab(tab);
  }
  return sortBy;
}

async function addIntakesSheet(
  wb: ExcelJS.Workbook,
  params: MattersExportParams,
  user: ExportUser
) {
  const where = buildIntakeWhere(params, user);
  const rows = await prisma.intake.findMany({
    where,
    orderBy: intakeOrderBy(params),
    include: intakeInclude
  });
  const coUserNames = await loadUserNameMap(rows.flatMap((row) => row.coUserIds));
  const groups = groupRowsByCategory(rows, params.category);
  if (groups.length === 0) {
    const sheet = wb.addWorksheet("æ— æ•°æ®");
    sheet.columns = intakeColumnsForKind("litigation");
    polishSheet(sheet, ["money", "feeAmount"]);
    return 0;
  }
  for (const group of groups) {
    const sheet = wb.addWorksheet(sheetName(`${TAB_LABEL[params.tab]}-${matterCategoryLabel[group.category]}`));
    sheet.columns = intakeColumnsForKind(matterCategoryKind(group.category));
    for (const intake of group.rows) {
      sheet.addRow(buildIntakeRow(intake, coUserNames));
    }
    polishSheet(sheet, ["money", "feeAmount"]);
  }
  return rows.length;
}

async function addMattersSheet(
  wb: ExcelJS.Workbook,
  params: MattersExportParams,
  user: ExportUser
) {
  const where = buildMatterWhere(params, user);
  const rows = sortMatterRows(
    await prisma.matter.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      include: matterInclude
    }),
    params
  );
  const coUserNames = await loadUserNameMap(
    rows.flatMap((row) => row.intake?.coUserIds ?? [])
  );
  const groups = groupRowsByCategory(rows, params.category);
  if (groups.length === 0) {
    const sheet = wb.addWorksheet("æ— æ•°æ®");
    sheet.columns = matterColumnsForKind("litigation", 1);
    polishSheet(sheet, ["claimAmount", "sourceClaimAmount", "sourceFeeAmount"]);
    return 0;
  }
  for (const group of groups) {
    const kind = matterCategoryKind(group.category);
    const maxProcedures =
      kind === "litigation"
        ? Math.max(
            1,
            group.rows.reduce((max, row) => Math.max(max, row.procedures.length), 0)
          )
        : 0;
    const sheet = wb.addWorksheet(sheetName(matterCategoryLabel[group.category]));
    sheet.columns = matterColumnsForKind(kind, maxProcedures);
    for (const matter of group.rows) {
      sheet.addRow(buildMatterRow(matter, maxProcedures, coUserNames));
    }
    polishSheet(sheet, ["claimAmount", "sourceClaimAmount", "sourceFeeAmount"]);
  }
  return rows.length;
}

function groupRowsByCategory<T extends { category: MatterCategory }>(
  rows: T[],
  category?: MatterCategory
) {
  return MATTER_CATEGORIES
    .filter((candidate) => !category || candidate === category)
    .map((candidate) => ({
      category: candidate,
      rows: rows.filter((row) => row.category === candidate)
    }))
    .filter((group) => group.rows.length > 0);
}

function buildIntakeWhere(params: MattersExportParams, user: ExportUser): Prisma.IntakeWhereInput {
  const parts: Prisma.IntakeWhereInput[] = [
    intakeVisibilityFilter(user.id, user.role),
    params.tab === "revision"
      ? { status: { in: ["NEEDS_REVISION"] } }
      : { status: { in: ["INTAKE", "PENDING_CONFIRMATION"] } }
  ];
  if (params.category) parts.push({ category: params.category });
  const from = resolveDateBoundary(params.from, false);
  const to = resolveDateBoundary(params.to, true);
  if (from || to) {
    parts.push({
      receivedAt: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {})
      }
    });
  }
  if (params.search) {
    parts.push({
      OR: [
        { title: { contains: params.search } },
        { description: { contains: params.search } },
        { client: { name: { contains: params.search } } },
        { cause: { name: { contains: params.search } } },
        { parties: { some: { name: { contains: params.search } } } }
      ]
    });
  }
  return { AND: parts };
}

function buildMatterWhere(params: MattersExportParams, user: ExportUser): Prisma.MatterWhereInput {
  const parts: Prisma.MatterWhereInput[] = [
    matterVisibilityFilter(user.id, user.role),
    { deletedAt: null },
    matterStatusWhere(params)
  ];
  if (params.category) parts.push({ category: params.category });
  const from = resolveDateBoundary(params.from, false);
  const to = resolveDateBoundary(params.to, true);
  if (from || to) {
    parts.push({
      intakeDate: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {})
      }
    });
  }
  if (params.search) {
    parts.push({
      OR: [
        { title: { contains: params.search } },
        { internalCode: { contains: params.search } },
        { firmCaseNo: { contains: params.search } },
        { primaryClient: { name: { contains: params.search } } },
        { cause: { name: { contains: params.search } } },
        { parties: { some: { name: { contains: params.search } } } },
        { procedures: { some: { caseNumber: { contains: params.search } } } }
      ]
    });
  }
  return { AND: parts };
}

function matterStatusWhere(params: MattersExportParams): Prisma.MatterWhereInput {
  if (params.tab === "archived") return { status: { in: ["ARCHIVED"] } };
  if (params.tab === "active") return { status: { notIn: ["CLOSED", "ARCHIVED"] } };
  if (params.status === "active") return { status: { in: ["IN_PROGRESS", "ON_HOLD"] } };
  if (params.status === "closed") return { status: { in: ["CLOSED"] } };
  if (params.status === "archived") return { status: { in: ["ARCHIVED"] } };
  return { status: { in: ["IN_PROGRESS", "ON_HOLD", "CLOSED", "ARCHIVED"] } };
}

function intakeOrderBy(params: MattersExportParams): Prisma.IntakeOrderByWithRelationInput[] {
  if (params.sortBy === "claimAmount") {
    return [{ claimAmount: params.sortDir }, { receivedAt: "desc" }];
  }
  return [{ receivedAt: params.sortDir }];
}

function sortMatterRows(rows: MatterExportRow[], params: MattersExportParams) {
  return [...rows].sort((a, b) => {
    const aValue = matterSortValue(a, params.sortBy);
    const bValue = matterSortValue(b, params.sortBy);
    const aEmpty = aValue === null || aValue === undefined;
    const bEmpty = bValue === null || bValue === undefined;
    if (aEmpty && bEmpty) return b.updatedAt.getTime() - a.updatedAt.getTime();
    if (aEmpty) return 1;
    if (bEmpty) return -1;
    const direction = params.sortDir === "asc" ? 1 : -1;
    const base =
      aValue instanceof Date || bValue instanceof Date
        ? (aValue as Date).getTime() - (bValue as Date).getTime()
        : Number(aValue) - Number(bValue);
    if (base !== 0) return base * direction;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}

function matterSortValue(row: MatterExportRow, sortBy: MatterSortBy) {
  if (sortBy === "hearing") {
    return (
      row.procedures
        .map((procedure) => procedure.hearings[0]?.startsAt ?? null)
        .filter((date): date is Date => !!date)
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null
    );
  }
  if (sortBy === "claimAmount") {
    return row.claimAmount === null || row.claimAmount === undefined
      ? null
      : Number(row.claimAmount);
  }
  if (sortBy === "archivedAt") {
    return row.archivedAt;
  }
  return row.intakeDate;
}

async function loadUserNameMap(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map<string, string>();
  const users = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, name: true }
  });
  return new Map(users.map((user) => [user.id, user.name]));
}

function intakeColumnsForKind(kind: MatterCategoryKind): Partial<ExcelJS.Column>[] {
  const commonStart: Partial<ExcelJS.Column>[] = [
    { header: "æ”¶æ¡ˆID", key: "id", width: 24 },
    { header: "æ ‡é¢˜", key: "title", width: 36 },
    { header: "æ”¶æ¡ˆåˆ†ç±»", key: "category", width: 12 },
    { header: "æ”¶æ¡ˆEstado", key: "status", width: 12 },
    { header: "æ”¶æ¡ˆæ—¶é—´", key: "receivedAt", width: 12 },
    { header: "Causa", key: "cause", width: 18 },
    { header: "è‡ªç”±Causa", key: "causeFreeText", width: 18 },
    { header: "æ¡ˆæƒ…DescripciÃ³n", key: "description", width: 36 },
    { header: "å§”æ‰˜æ–¹", key: "client", width: 20 },
    { header: "å§”æ‰˜æ–¹ç±»åž‹", key: "clientType", width: 12 },
    { header: "å§”æ‰˜æ–¹è¯ä»¶/ä»£ç ", key: "clientIdNumber", width: 22 },
    { header: "å§”æ‰˜æ–¹åœ°å€", key: "clientAddress", width: 28 },
    { header: "æ³•å®šä»£è¡¨äºº", key: "clientLegalRep", width: 14 },
    { header: "è”ç³»äºº", key: "contactName", width: 14 },
    { header: "è”ç³»ç”µè¯", key: "contactPhone", width: 16 },
    { header: "Clienteæ¡£æ¡ˆè”ç³»äºº", key: "clientContacts", width: 28 },
    { header: "ä¸»åŠžAbogado", key: "owner", width: 12 },
    { header: "å…±åŒAbogado", key: "coUsers", width: 24 }
  ];
  const litigationColumns: Partial<ExcelJS.Column>[] = [
    { header: "é¦–æ¬¡ç¨‹åº", key: "firstProcedureType", width: 14 },
    { header: "äº‰è®®è§£å†³æœºæž„", key: "firstAgency", width: 24 },
    { header: "ç®¡è¾–åœ°", key: "jurisdiction", width: 18 },
    { header: "æˆ‘æ–¹åœ°ä½", key: "ourStanding", width: 14 },
    { header: "æ ‡çš„Monto", key: "money", width: 14 },
    { header: "æ ‡çš„DescripciÃ³n", key: "claimDescription", width: 24 },
    { header: "å¾‹åå¤‡æ¡ˆ", key: "barFiling", width: 18 },
    { header: "æ˜¯å¦åè¯‰", key: "counterclaim", width: 10 },
    { header: "å½“äº‹äºº", key: "parties", width: 44 }
  ];
  const projectColumns: Partial<ExcelJS.Column>[] = [
    { header: "ä¸šåŠ¡ç±»åž‹", key: "businessType", width: 16 },
    { header: "æœåŠ¡èŒƒå›´", key: "serviceScope", width: 28 },
    { header: "äº¤ä»˜æˆæžœ", key: "deliverables", width: 24 },
    { header: "æœåŠ¡èµ·", key: "serviceStart", width: 12 },
    { header: "æœåŠ¡æ­¢", key: "serviceEnd", width: 12 },
    { header: "ç›¸å…³æ–¹", key: "parties", width: 44 }
  ];
  const counselColumns: Partial<ExcelJS.Column>[] = [
    { header: "é¡¾é—®ç±»åž‹", key: "counselType", width: 16 },
    { header: "æœåŠ¡èŒƒå›´", key: "serviceScope", width: 28 },
    { header: "æœåŠ¡èµ·", key: "serviceStart", width: 12 },
    { header: "æœåŠ¡æ­¢", key: "serviceEnd", width: 12 },
    { header: "ç›¸å…³æ–¹", key: "parties", width: 44 }
  ];
  const commonEnd: Partial<ExcelJS.Column>[] = [
    { header: "æ”¶è´¹æ–¹å¼", key: "feeType", width: 14 },
    { header: "Abogadoè´¹Monto", key: "feeAmount", width: 14 },
    { header: "é£Žé™©ä»£ç†æ¡æ¬¾", key: "contingencyTerms", width: 26 },
    { header: "ä»˜æ¬¾Etapa", key: "feeSchedule", width: 26 },
    { header: "GastosObservaciones", key: "feeNote", width: 24 },
    { header: "Adjunto", key: "documents", width: 36 },
    { header: "è½¬åŒ–Caso", key: "matter", width: 28 },
    { header: "No aceptar caso/è¡¥æ­£Motivo", key: "declinedReason", width: 30 },
    { header: "Crearæ—¶é—´", key: "createdAt", width: 18 },
    { header: "Actualizaræ—¶é—´", key: "updatedAt", width: 18 }
  ];
  const typedColumns =
    kind === "litigation"
      ? litigationColumns
      : kind === "project"
        ? projectColumns
        : counselColumns;
  return [...commonStart, ...typedColumns, ...commonEnd];
}

function matterColumnsForKind(
  kind: MatterCategoryKind,
  maxProcedures: number
): Partial<ExcelJS.Column>[] {
  const commonStart: Partial<ExcelJS.Column>[] = [
    { header: "Sistemaç¼–å·", key: "internalCode", width: 16 },
    { header: "æ‰€å†…æ¡ˆå·", key: "firmCaseNo", width: 18 },
    { header: "CasoNombre", key: "title", width: 38 },
    { header: "Casoåˆ†ç±»", key: "category", width: 12 },
    { header: "CasoEstado", key: "status", width: 12 },
    { header: "æ”¶æ¡ˆæ—¶é—´", key: "intakeDate", width: 12 },
    { header: "é¦–æ¬¡ç«‹æ¡ˆ/å—ç†", key: "firstAcceptedAt", width: 12 },
    { header: "Cerrar casoæ—¶é—´", key: "closedAt", width: 12 },
    { header: "å½’æ¡£æ—¶é—´", key: "archivedAt", width: 12 },
    { header: "ä¸»Cliente", key: "primaryClient", width: 20 },
    { header: "ä¸»Clienteç±»åž‹", key: "primaryClientType", width: 12 },
    { header: "ä¸»Clienteè¯ä»¶/ä»£ç ", key: "primaryClientIdNumber", width: 22 },
    { header: "ä¸»Clienteåœ°å€", key: "primaryClientAddress", width: 28 },
    { header: "ä¸»Clienteæ³•å®šä»£è¡¨äºº", key: "primaryClientLegalRep", width: 16 },
    { header: "ä¸»Clienteè”ç³»äºº", key: "primaryClientContacts", width: 28 },
    { header: "å…¶ä»–Cliente", key: "otherClients", width: 30 },
    { header: "ä¸»åŠžAbogado", key: "owner", width: 12 },
    { header: "å›¢é˜Ÿæˆå‘˜", key: "members", width: 30 }
  ];
  const litigationColumns: Partial<ExcelJS.Column>[] = [
    { header: "Causa", key: "cause", width: 18 },
    { header: "è‡ªç”±Causa", key: "causeFreeText", width: 18 },
    { header: "æ ‡çš„Monto", key: "claimAmount", width: 14 },
    { header: "æˆ‘æ–¹åœ°ä½", key: "ourStanding", width: 14 },
    { header: "åè¯‰åŽŸå‘Š", key: "counterclaimAsPlaintiff", width: 10 },
    { header: "åè¯‰è¢«å‘Š", key: "counterclaimAsDefendant", width: 10 },
    { header: "å¾‹åå¤‡æ¡ˆ", key: "barFiling", width: 18 },
    { header: "Casoå½“äº‹äºº", key: "parties", width: 48 }
  ];
  const projectColumns: Partial<ExcelJS.Column>[] = [
    { header: "ä¸šåŠ¡ç±»åž‹", key: "businessType", width: 16 },
    { header: "æœåŠ¡èŒƒå›´", key: "serviceScope", width: 28 },
    { header: "äº¤ä»˜æˆæžœ", key: "deliverables", width: 24 },
    { header: "æœåŠ¡èµ·", key: "serviceStart", width: 12 },
    { header: "æœåŠ¡æ­¢", key: "serviceEnd", width: 12 },
    { header: "ç›¸å…³æ–¹", key: "parties", width: 48 },
    { header: "é˜¶æ®µ/ç¨‹åºæ‘˜è¦", key: "procedureSummary", width: 42 }
  ];
  const counselColumns: Partial<ExcelJS.Column>[] = [
    { header: "é¡¾é—®ç±»åž‹", key: "counselType", width: 16 },
    { header: "æœåŠ¡èŒƒå›´", key: "serviceScope", width: 28 },
    { header: "æœåŠ¡èµ·", key: "serviceStart", width: 12 },
    { header: "æœåŠ¡æ­¢", key: "serviceEnd", width: 12 },
    { header: "ç›¸å…³æ–¹", key: "parties", width: 48 },
    { header: "é˜¶æ®µ/ç¨‹åºæ‘˜è¦", key: "procedureSummary", width: 42 }
  ];
  const commonEnd: Partial<ExcelJS.Column>[] = [
    { header: "å…³è”å®žä½“", key: "relatedEntities", width: 36 },
    { header: "å…³è”Caso", key: "relatedMatters", width: 36 },
    { header: "CasoAdjunto", key: "documents", width: 36 },
    { header: "è‡ªå®šä¹‰å­—æ®µ", key: "customValues", width: 30 },
    { header: "æ¥æºæ”¶æ¡ˆæ ‡é¢˜", key: "intakeTitle", width: 34 },
    { header: "æ¥æºæ”¶æ¡ˆEstado", key: "intakeStatus", width: 12 },
    { header: "æ¥æºæ”¶æ¡ˆæ—¶é—´", key: "sourceReceivedAt", width: 12 },
    { header: "æ¥æºæ”¶æ¡ˆæ¡ˆæƒ…", key: "sourceDescription", width: 34 },
    { header: "æ¥æºæ”¶è´¹æ–¹å¼", key: "sourceFeeType", width: 14 },
    { header: "æ¥æºAbogadoè´¹Monto", key: "sourceFeeAmount", width: 14 },
    { header: "æ¥æºä»˜æ¬¾Etapa", key: "sourceFeeSchedule", width: 26 },
    { header: "æ¥æºGastosObservaciones", key: "sourceFeeNote", width: 24 },
    { header: "æ¥æºå…±åŒAbogado", key: "sourceCoUsers", width: 24 },
    { header: "æ¥æºAdjunto", key: "sourceDocuments", width: 36 },
    { header: "Crearæ—¶é—´", key: "createdAt", width: 18 },
    { header: "Actualizaræ—¶é—´", key: "updatedAt", width: 18 }
  ];
  const litigationSourceColumns: Partial<ExcelJS.Column>[] = [
    { header: "æ¥æºæ”¶æ¡ˆé¦–æ¬¡ç¨‹åº", key: "sourceFirstProcedureType", width: 14 },
    { header: "æ¥æºäº‰è®®è§£å†³æœºæž„", key: "sourceFirstAgency", width: 24 },
    { header: "æ¥æºç®¡è¾–åœ°", key: "sourceJurisdiction", width: 18 },
    { header: "æ¥æºæˆ‘æ–¹åœ°ä½", key: "sourceOurStanding", width: 14 },
    { header: "æ¥æºæ ‡çš„Monto", key: "sourceClaimAmount", width: 14 },
    { header: "æ¥æºæ ‡çš„DescripciÃ³n", key: "sourceClaimDescription", width: 24 },
    { header: "æ¥æºå¾‹åå¤‡æ¡ˆ", key: "sourceBarFiling", width: 18 },
    { header: "æ¥æºæ˜¯å¦åè¯‰", key: "sourceCounterclaim", width: 12 }
  ];
  const projectSourceColumns: Partial<ExcelJS.Column>[] = [
    { header: "æ¥æºä¸šåŠ¡ç±»åž‹", key: "sourceBusinessType", width: 16 },
    { header: "æ¥æºæœåŠ¡èŒƒå›´", key: "sourceServiceScope", width: 28 },
    { header: "æ¥æºäº¤ä»˜æˆæžœ", key: "sourceDeliverables", width: 24 },
    { header: "æ¥æºæœåŠ¡èµ·", key: "sourceServiceStart", width: 12 },
    { header: "æ¥æºæœåŠ¡æ­¢", key: "sourceServiceEnd", width: 12 }
  ];
  const counselSourceColumns: Partial<ExcelJS.Column>[] = [
    { header: "æ¥æºé¡¾é—®ç±»åž‹", key: "sourceCounselType", width: 16 },
    { header: "æ¥æºæœåŠ¡èŒƒå›´", key: "sourceServiceScope", width: 28 },
    { header: "æ¥æºæœåŠ¡èµ·", key: "sourceServiceStart", width: 12 },
    { header: "æ¥æºæœåŠ¡æ­¢", key: "sourceServiceEnd", width: 12 }
  ];
  const typedColumns =
    kind === "litigation"
      ? litigationColumns
      : kind === "project"
        ? projectColumns
        : counselColumns;
  const typedSourceColumns =
    kind === "litigation"
      ? litigationSourceColumns
      : kind === "project"
        ? projectSourceColumns
        : counselSourceColumns;
  const procedureColumns: Partial<ExcelJS.Column>[] = [];
  for (let i = 1; i <= maxProcedures; i += 1) {
    procedureColumns.push(
      { header: `ç¨‹åº${i}-ç±»åž‹`, key: `procedure${i}Type`, width: 14 },
      { header: `ç¨‹åº${i}-æ ‡ç­¾`, key: `procedure${i}Label`, width: 16 },
      { header: `ç¨‹åº${i}-å‚yæ–¹å¼`, key: `procedure${i}Engagement`, width: 12 },
      { header: `ç¨‹åº${i}-Estado`, key: `procedure${i}Status`, width: 12 },
      { header: `ç¨‹åº${i}-æ¡ˆå·`, key: `procedure${i}CaseNumber`, width: 24 },
      { header: `ç¨‹åº${i}-ç®¡è¾–åœ°`, key: `procedure${i}Jurisdiction`, width: 18 },
      { header: `ç¨‹åº${i}-åŠžç†æœºå…³`, key: `procedure${i}HandlingAgency`, width: 24 },
      { header: `ç¨‹åº${i}-åˆè®®åº­/éƒ¨é—¨`, key: `procedure${i}Panel`, width: 20 },
      { header: `ç¨‹åº${i}-ç»åŠžäºº`, key: `procedure${i}Handler`, width: 16 },
      { header: `ç¨‹åº${i}-æˆ‘æ–¹åœ°ä½`, key: `procedure${i}OurStanding`, width: 14 },
      { header: `ç¨‹åº${i}-ä¸»åŠžAbogado`, key: `procedure${i}LeadLawyer`, width: 14 },
      { header: `ç¨‹åº${i}-å¤–éƒ¨ä»£ç†`, key: `procedure${i}ExternalLead`, width: 10 },
      { header: `ç¨‹åº${i}-ç«‹æ¡ˆ/å—ç†`, key: `procedure${i}AcceptedAt`, width: 12 },
      { header: `ç¨‹åº${i}-è£å†³/Cerrar caso`, key: `procedure${i}ConcludedAt`, width: 12 },
      { header: `ç¨‹åº${i}-ç»“æžœ`, key: `procedure${i}Outcome`, width: 12 },
      { header: `ç¨‹åº${i}-ç»“æžœè¯´æ˜Ž`, key: `procedure${i}OutcomeNote`, width: 26 },
      { header: `ç¨‹åº${i}-ä¸»å®¡/ä»²è£å‘˜/æ‰§è¡Œæ³•å®˜`, key: `procedure${i}PresidingJudge`, width: 22 },
      { header: `ç¨‹åº${i}-è”ç³»æ–¹å¼`, key: `procedure${i}PresidingJudgeContact`, width: 18 },
      { header: `ç¨‹åº${i}-åŠ©ç†`, key: `procedure${i}JudgeAssistant`, width: 16 },
      { header: `ç¨‹åº${i}-åŠ©ç†è”ç³»æ–¹å¼`, key: `procedure${i}JudgeAssistantContact`, width: 18 },
      { header: `ç¨‹åº${i}-ç¨‹åºå½“äº‹äºº`, key: `procedure${i}Parties`, width: 48 }
    );
  }

  return [
    ...commonStart,
    ...typedColumns,
    ...procedureColumns,
    ...typedSourceColumns,
    ...commonEnd
  ];
}

function buildIntakeRow(intake: IntakeExportRow, coUserNames: Map<string, string>) {
  return {
    id: intake.id,
    title: intake.title,
    category: matterCategoryLabel[intake.category],
    status: label(intakeStatusLabel, intake.status),
    receivedAt: formatDate(intake.receivedAt),
    cause: intake.cause?.name ?? "",
    causeFreeText: intake.causeFreeText ?? "",
    description: intake.description ?? "",
    client: intake.client?.name ?? "",
    clientType: intake.client ? clientTypeLabel[intake.client.type] : label(clientTypeLabel, intake.clientType),
    clientIdNumber: intake.client?.idNumber ?? "",
    clientAddress: intake.client?.address ?? "",
    clientLegalRep: intake.client?.legalRep ?? "",
    contactName: intake.contactName ?? "",
    contactPhone: intake.contactPhone ?? intake.client?.phone ?? "",
    clientContacts: formatContacts(intake.client?.contacts ?? []),
    firstProcedureType: label(procedureTypeLabel, intake.firstProcedureType),
    firstAgency: intake.firstAgency ?? "",
    jurisdiction: intake.jurisdiction ?? "",
    ourStanding: label(litigationStandingLabel, intake.ourStanding),
    money: decimalNumber(intake.claimAmount),
    claimDescription: intake.claimDescription ?? "",
    barFiling: label(barFilingLabel, intake.barFiling),
    counterclaim: yesNo(intake.counterclaim),
    businessType: intake.businessType ?? "",
    serviceScope: intake.serviceScope ?? "",
    deliverables: intake.deliverables ?? "",
    counselType: intake.counselType ?? "",
    serviceStart: formatDate(intake.serviceStart),
    serviceEnd: formatDate(intake.serviceEnd),
    feeType: label(feeTypeLabel, intake.feeType),
    feeAmount: decimalNumber(intake.feeAmount),
    contingencyTerms: intake.contingencyTerms ?? "",
    feeSchedule: intake.feeSchedule ?? "",
    feeNote: intake.feeNote ?? "",
    owner: intake.ownerUser?.name ?? "",
    coUsers: intake.coUserIds.map((id) => coUserNames.get(id) ?? id).join("ï¼›"),
    parties: formatParties(intake.parties),
    documents: formatDocuments(intake.documents),
    matter: intake.matter
      ? `${intake.matter.firmCaseNo ?? intake.matter.internalCode} ${intake.matter.title}`
      : "",
    declinedReason: intake.declinedReason ?? "",
    createdAt: formatDateTime(intake.createdAt),
    updatedAt: formatDateTime(intake.updatedAt)
  };
}

function buildMatterRow(
  matter: MatterExportRow,
  maxProcedures: number,
  coUserNames: Map<string, string>
) {
  const otherClients = matter.clientLinks
    .filter((link) => link.clientId !== matter.primaryClientId)
    .map((link) => `${link.label ? `${link.label}:` : ""}${link.client.name}`)
    .join("ï¼›");
  const source = matter.intake;
  const row: Record<string, unknown> = {
    internalCode: matter.internalCode,
    firmCaseNo: matter.firmCaseNo ?? "",
    title: matter.title,
    category: matterCategoryLabel[matter.category],
    status: matterStatusLabel[matter.status],
    cause: matter.cause?.name ?? "",
    causeFreeText: matter.causeFreeText ?? "",
    claimAmount: decimalNumber(matter.claimAmount),
    ourStanding: label(litigationStandingLabel, matter.ourStanding),
    counterclaimAsPlaintiff: yesNo(matter.counterclaimAsPlaintiff),
    counterclaimAsDefendant: yesNo(matter.counterclaimAsDefendant),
    barFiling: label(barFilingLabel, matter.barFiling),
    businessType: matter.businessType ?? "",
    serviceScope: matter.serviceScope ?? "",
    deliverables: matter.deliverables ?? "",
    counselType: matter.counselType ?? "",
    serviceStart: formatDate(matter.serviceStart),
    serviceEnd: formatDate(matter.serviceEnd),
    intakeDate: formatDate(matter.intakeDate),
    firstAcceptedAt: formatDate(matter.firstAcceptedAt),
    closedAt: formatDate(matter.closedAt),
    archivedAt: formatDate(matter.archivedAt),
    primaryClient: matter.primaryClient?.name ?? "",
    primaryClientType: matter.primaryClient ? clientTypeLabel[matter.primaryClient.type] : "",
    primaryClientIdNumber: matter.primaryClient?.idNumber ?? "",
    primaryClientAddress: matter.primaryClient?.address ?? "",
    primaryClientLegalRep: matter.primaryClient?.legalRep ?? "",
    primaryClientContacts: formatContacts(matter.primaryClient?.contacts ?? []),
    otherClients,
    owner: matter.owner.name,
    members: matter.members
      .map((member) => `${member.user.name}ï¼ˆ${memberRoleLabel[member.role]}ï¼‰`)
      .join("ï¼›"),
    parties: formatParties(matter.parties),
    procedureSummary: formatProcedureSummary(matter.procedures),
    relatedEntities: matter.relatedEntities
      .map((entity) => [entity.name, entity.relationship, entity.notes].filter(Boolean).join(" / "))
      .join("ï¼›"),
    relatedMatters: formatRelatedMatters(matter),
    documents: formatDocuments(matter.documents),
    customValues: formatJson(matter.customValues),
    intakeTitle: source?.title ?? "",
    intakeStatus: label(intakeStatusLabel, source?.status),
    sourceReceivedAt: formatDate(source?.receivedAt),
    sourceDescription: source?.description ?? "",
    sourceFirstProcedureType: label(procedureTypeLabel, source?.firstProcedureType),
    sourceFirstAgency: source?.firstAgency ?? "",
    sourceJurisdiction: source?.jurisdiction ?? "",
    sourceOurStanding: label(litigationStandingLabel, source?.ourStanding),
    sourceClaimAmount: decimalNumber(source?.claimAmount),
    sourceClaimDescription: source?.claimDescription ?? "",
    sourceBarFiling: label(barFilingLabel, source?.barFiling),
    sourceCounterclaim: source ? yesNo(source.counterclaim) : "",
    sourceBusinessType: source?.businessType ?? "",
    sourceServiceScope: source?.serviceScope ?? "",
    sourceDeliverables: source?.deliverables ?? "",
    sourceCounselType: source?.counselType ?? "",
    sourceServiceStart: formatDate(source?.serviceStart),
    sourceServiceEnd: formatDate(source?.serviceEnd),
    sourceFeeType: label(feeTypeLabel, source?.feeType),
    sourceFeeAmount: decimalNumber(source?.feeAmount),
    sourceFeeSchedule: source?.feeSchedule ?? "",
    sourceFeeNote: source?.feeNote ?? "",
    sourceCoUsers: (source?.coUserIds ?? []).map((id) => coUserNames.get(id) ?? id).join("ï¼›"),
    sourceDocuments: formatDocuments(source?.documents ?? []),
    createdAt: formatDateTime(matter.createdAt),
    updatedAt: formatDateTime(matter.updatedAt)
  };

  for (let i = 0; i < maxProcedures; i += 1) {
    Object.assign(row, buildProcedureCells(matter.procedures[i], i + 1));
  }
  return row;
}

function buildProcedureCells(
  procedure: MatterExportRow["procedures"][number] | undefined,
  index: number
) {
  if (!procedure) return {};
  return {
    [`procedure${index}Type`]: label(procedureTypeLabel, procedure.type),
    [`procedure${index}Label`]: procedure.customLabel ?? "",
    [`procedure${index}Engagement`]: procedureEngagementLabel[procedure.engagement],
    [`procedure${index}Status`]: procedureStatusLabel[procedure.status],
    [`procedure${index}CaseNumber`]: procedure.caseNumber ?? "",
    [`procedure${index}Jurisdiction`]: procedure.jurisdiction ?? "",
    [`procedure${index}HandlingAgency`]: procedure.handlingAgency ?? "",
    [`procedure${index}Panel`]: procedure.panel ?? "",
    [`procedure${index}Handler`]: procedure.handler ?? "",
    [`procedure${index}OurStanding`]: label(litigationStandingLabel, procedure.ourStanding),
    [`procedure${index}LeadLawyer`]: procedure.leadLawyer?.name ?? "",
    [`procedure${index}ExternalLead`]: yesNo(procedure.isExternalLead),
    [`procedure${index}AcceptedAt`]: formatDate(procedure.acceptedAt),
    [`procedure${index}ConcludedAt`]: formatDate(procedure.concludedAt),
    [`procedure${index}Outcome`]: label(procedureOutcomeLabel, procedure.outcome),
    [`procedure${index}OutcomeNote`]: procedure.outcomeNote ?? "",
    [`procedure${index}PresidingJudge`]: procedure.presidingJudge ?? "",
    [`procedure${index}PresidingJudgeContact`]: procedure.presidingJudgeContact ?? "",
    [`procedure${index}JudgeAssistant`]: procedure.judgeAssistant ?? "",
    [`procedure${index}JudgeAssistantContact`]: procedure.judgeAssistantContact ?? "",
    [`procedure${index}Parties`]: procedure.procedureParties
      .map((row) => `${label(litigationStandingLabel, row.standing)}ï¼š${formatParty(row.party)}`)
      .join("ï¼›")
  };
}

function formatProcedureSummary(procedures: MatterExportRow["procedures"]) {
  return procedures
    .map((procedure) =>
      [
        label(procedureTypeLabel, procedure.type),
        procedure.customLabel,
        procedure.caseNumber,
        procedure.handlingAgency,
        procedure.status ? procedureStatusLabel[procedure.status] : "",
        procedure.acceptedAt ? `å—ç†:${formatDate(procedure.acceptedAt)}` : "",
        procedure.concludedAt ? `Cerrar caso:${formatDate(procedure.concludedAt)}` : "",
        procedure.outcome ? `ç»“æžœ:${procedureOutcomeLabel[procedure.outcome]}` : ""
      ].filter(Boolean).join(" / ")
    )
    .join("ï¼›");
}

function formatParties(parties: { role: PartyRole; standing: LitigationStanding | null; partyType: PartyType; name: string; idNumber: string | null; enterpriseSocialCode: string | null; phone: string | null; address: string | null; legalRep: string | null; contactName: string | null; notes: string | null }[]) {
  return parties
    .map((party) => `${partyRoleLabel[party.role]}ï¼š${formatParty(party)}`)
    .join("ï¼›");
}

function formatParty(party: {
  standing?: LitigationStanding | null;
  partyType: PartyType;
  name: string;
  idNumber?: string | null;
  enterpriseSocialCode?: string | null;
  phone?: string | null;
  address?: string | null;
  legalRep?: string | null;
  contactName?: string | null;
  notes?: string | null;
}) {
  const detail = [
    label(litigationStandingLabel, party.standing),
    partyTypeLabel[party.partyType],
    party.idNumber ? `è¯ä»¶:${party.idNumber}` : "",
    party.enterpriseSocialCode ? `ä»£ç :${party.enterpriseSocialCode}` : "",
    party.phone ? `ç”µè¯:${party.phone}` : "",
    party.legalRep ? `æ³•å®šä»£è¡¨äºº:${party.legalRep}` : "",
    party.contactName ? `è”ç³»äºº:${party.contactName}` : "",
    party.address ? `åœ°å€:${party.address}` : "",
    party.notes ? `Observaciones:${party.notes}` : ""
  ].filter(Boolean);
  return detail.length > 0 ? `${party.name}ï¼ˆ${detail.join("ï¼Œ")}ï¼‰` : party.name;
}

function formatContacts(
  contacts: { name: string; title: string | null; phone: string | null; email: string | null; isPrimary: boolean }[]
) {
  return contacts
    .map((contact) =>
      [
        contact.isPrimary ? "ä¸»" : "",
        contact.name,
        contact.title,
        contact.phone,
        contact.email
      ].filter(Boolean).join(" / ")
    )
    .join("ï¼›");
}

function formatDocuments(documents: { name: string; category: string; createdAt: Date }[]) {
  return documents
    .map((doc) => `${doc.name}ï¼ˆ${doc.category}ï¼Œ${formatDate(doc.createdAt)}ï¼‰`)
    .join("ï¼›");
}

function formatRelatedMatters(matter: MatterExportRow) {
  const from = matter.linksFrom.map((link) => link.relatedMatter);
  const to = matter.linksTo.map((link) => link.matter);
  return [...from, ...to]
    .map((row) => `${row.firmCaseNo ?? row.internalCode} ${row.title}`)
    .join("ï¼›");
}

function polishSheet(sheet: ExcelJS.Worksheet, moneyColumnKeys: string[]) {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle" };
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: sheet.columnCount }
  };
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.alignment = { vertical: "top", wrapText: true };
    }
  });
  const columnKeys = new Set(sheet.columns.map((column) => column.key).filter(Boolean));
  for (const key of moneyColumnKeys) {
    if (columnKeys.has(key)) {
      sheet.getColumn(key).numFmt = "#,##0.00";
    }
  }
}

function buildFilename(tab: MattersExportTab) {
  return `lawlink-matters-${TAB_FILE_KEY[tab]}-${formatDate(new Date())}.xlsx`;
}

function sheetName(name: string) {
  return name.replace(/[\\/:*?\[\]]/g, "").slice(0, 31) || "Sheet";
}

function cleanText(input: string | null) {
  const value = input?.trim();
  return value || undefined;
}

function cleanDateText(input: string | null) {
  const value = cleanText(input);
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function resolveDateBoundary(input: string | undefined, endOfDay: boolean) {
  if (!input) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!match) return undefined;
  const [, year, month, day] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0
  );
}

function formatDate(date: Date | null | undefined) {
  if (!date) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function formatDateTime(date: Date | null | undefined) {
  if (!date) return "";
  return `${formatDate(date)} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function decimalNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) return "";
  return Number(value);
}

function yesNo(value: boolean | null | undefined) {
  return value ? "æ˜¯" : "å¦";
}

function label<T extends string>(
  labels: Partial<Record<T, string>>,
  value: T | null | undefined
) {
  return value ? labels[value] ?? value : "";
}

function formatJson(value: Prisma.JsonValue) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.length > 0 ? JSON.stringify(value) : "";
  if (typeof value === "object") {
    return Object.keys(value).length > 0 ? JSON.stringify(value) : "";
  }
  return String(value);
}


