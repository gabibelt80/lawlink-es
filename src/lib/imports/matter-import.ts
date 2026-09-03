/**
 * v0.42 æ‰¹Fï¼ˆÃ­tems6ï¼‰Casoæ‰¹é‡å¯¼å…¥ â€”â€” çº¯é€»è¾‘ï¼ˆæ—  DB / æ—  exceljs ä¾èµ–ï¼Œä¾¿äºŽå•æµ‹ï¼‰ã€‚
 * åˆ—å®šä¹‰ã€æ–‡æœ¬â†’æžšä¸¾æ˜ å°„ã€æ ‡é¢˜ç”Ÿæˆã€é¦–ç¨‹åºæŽ¨æ–­ã€å•è¡Œç»“æž„æ ¡éªŒéƒ½åœ¨è¿™é‡Œï¼›
 * AbogadoEmail / Causaçš„ DB æŸ¥æ‰¾æ”¾åœ¨ server/imports/actions.tsã€‚
 */
import type {
  MatterCategory,
  MatterStatus,
  ClientType,
  PartyType,
  ProcedureType,
} from "@prisma/client";

import { matterCategoryLabel, matterStatusLabel } from "@/lib/enums";

/** å¯¼å…¥åˆ—å®šä¹‰ï¼ˆkey = å†…éƒ¨å­—æ®µï¼Œheader = Excel è¡¨å¤´ï¼‰ */
export interface ImportColumn {
  key: string;
  header: string;
  required: boolean;
  hint?: string;
}

export const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "clientName", header: "Nombre del Cliente", required: true },
  {
    key: "clientIdNumber",
    header: "Documento del Cliente",
    required: true,
    hint: "Documento de identidad / CÃ³digo de identificaciÃ³n tributaria",
  },
  {
    key: "clientType",
    header: "Tipo del Cliente",
    required: false,
    hint: "Persona / Empresa, por defecto persona",
  },
  { key: "opposingName", header: "Nombre de la contraparte", required: true },
  {
    key: "opposingIdNumber",
    header: "Documento de la contraparte",
    required: true,
  },
  {
    key: "opposingType",
    header: "Tipo de contraparte",
    required: false,
    hint: "Persona / Empresa, por defecto persona",
  },
  {
    key: "category",
    header: "Tipo de caso",
    required: true,
    hint: Object.values(matterCategoryLabel).join(" / "),
  },
  {
    key: "status",
    header: "Estado del caso",
    required: true,
    hint: "En trÃ¡mite / Cerrado / Archivado",
  },
  {
    key: "ownerEmail",
    header: "Email del Abogado Principal",
    required: false,
    hint: "Coincidir exactamente por email; si se deja vacÃ­o, se asigna al importador actual",
  },
  {
    key: "intakeDate",
    header: "Fecha de admisiÃ³n",
    required: false,
    hint: "YYYY-MM-DD",
  },
  {
    key: "cause",
    header: "Causa",
    required: false,
    hint: "Coincidir con el catÃ¡logo de causas; si no hay coincidencia, se usa como texto libre",
  },
  {
    key: "claimAmount",
    header: "Monto",
    required: false,
    hint: "NÃºmero, en yuanes",
  },
  { key: "clientPhone", header: "TelÃ©fono de contacto", required: false },
  { key: "jurisdiction", header: "JurisdicciÃ³n", required: false },
];

export type RawRow = Record<string, string>;

export interface NormalizedRow {
  clientName: string;
  clientIdNumber: string;
  clientType: ClientType;
  clientPhone: string | null;
  opposingName: string;
  opposingIdNumber: string;
  opposingPartyType: PartyType;
  clientPartyType: PartyType;
  category: MatterCategory;
  status: MatterStatus;
  ownerEmail: string | null;
  intakeDate: Date | null;
  causeText: string | null;
  claimAmount: number | null;
  jurisdiction: string | null;
}

/** æ–‡æœ¬åæŸ¥Casoç±»åž‹ï¼ˆæŒ‰ matterCategoryLabelï¼‰ */
export function parseCategoryLabel(text: string): MatterCategory | null {
  const t = text.trim();
  for (const [key, label] of Object.entries(matterCategoryLabel)) {
    if (label === t) return key as MatterCategory;
  }
  return null;
}

/** æ–‡æœ¬åæŸ¥CasoEstadoï¼ˆå…¼å®¹ã€ŒCerrar casoã€=ã€Œå·²Cerrar casoã€ï¼‰ */
export function parseStatusLabel(text: string): MatterStatus | null {
  const t = text.trim();
  if (t === "Cerrar caso") return "CLOSED";
  for (const [key, label] of Object.entries(matterStatusLabel)) {
    if (label === t) return key as MatterStatus;
  }
  return null;
}

/** ä¸ªäºº / ä¼ä¸š â†’ ClientTypeï¼ˆé»˜è®¤ä¸ªäººï¼‰ */
export function parseClientType(text: string | undefined): ClientType {
  const t = (text ?? "").trim();
  if (t === "ä¼ä¸š" || t === "å…¬å¸" || t === "å•ä½") return "COMPANY";
  return "INDIVIDUAL";
}

/** ä¸ªäºº / ä¼ä¸š â†’ PartyTypeï¼ˆé»˜è®¤è‡ªç„¶äººï¼‰ */
export function parsePartyType(text: string | undefined): PartyType {
  const t = (text ?? "").trim();
  if (t === "ä¼ä¸š" || t === "å…¬å¸" || t === "å•ä½") return "COMPANY";
  return "NATURAL_PERSON";
}

/** æ”¶æ¡ˆFechaè§£æžï¼šæŽ¥å— YYYY-MM-DD / YYYY/MM/DDï¼ˆå·²ç”±è°ƒç”¨æ–¹æŠŠ Excel Fechaæ ¼å¼åŒ–ä¸ºå­—ç¬¦ä¸²ï¼‰ */
export function parseImportDate(text: string | undefined): Date | null {
  const t = (text ?? "").trim();
  if (!t) return null;
  const m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/** æ ‡çš„é¢è§£æžï¼šåŽ»æŽ‰é€—å·/ï¿¥/pesosï¼Œè½¬æ•°å­— */
export function parseAmount(text: string | undefined): number | null {
  const t = (text ?? "").trim().replace(/[,$ï¿¥\spesos]/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Casoæ ‡é¢˜ï¼š`Cliente y ç›¸å¯¹æ–¹ Causa`ï¼ˆæ— é‡å¤ç©ºæ ¼ï¼‰ */
export function buildMatterTitle(
  clientName: string,
  opposingName: string,
  cause: string | null,
): string {
  const base = `${clientName.trim()} y ${opposingName.trim()}`;
  const c = (cause ?? "").trim();
  return c ? `${base} ${c}` : base;
}

/** é¦–ç¨‹åºç±»åž‹ï¼šyæ”¶æ¡ˆè½¬åŒ–ï¼ˆconvertIntakeToMatterï¼‰ä¸€è‡´çš„æŽ¨æ–­ */
export function firstProcedureTypeFor(category: MatterCategory): ProcedureType {
  return category === "CIVIL_COMMERCIAL" ||
    category === "CRIMINAL" ||
    category === "ADMINISTRATIVE"
    ? ("FIRST_INSTANCE" as ProcedureType)
    : ("NON_LITIGATION_PHASE" as ProcedureType);
}

export interface RowValidation {
  errors: string[];
  normalized: NormalizedRow | null;
}

/** å•è¡Œç»“æž„æ ¡éªŒ + æžšä¸¾/æ•°å€¼/Fechaå½’ä¸€åŒ–ï¼ˆä¸å« DB æŸ¥æ‰¾ï¼‰ */
export function validateRow(raw: RawRow): RowValidation {
  const errors: string[] = [];
  const get = (k: string) => (raw[k] ?? "").trim();

  const clientName = get("clientName");
  const clientIdNumber = get("clientIdNumber");
  const opposingName = get("opposingName");
  const opposingIdNumber = get("opposingIdNumber");
  if (!clientName) errors.push("ç¼ºå°‘ClienteNombre");
  if (!clientIdNumber) errors.push("ç¼ºå°‘Clienteè¯ä»¶å·");
  if (!opposingName) errors.push("ç¼ºå°‘ç›¸å¯¹æ–¹Nombre");
  if (!opposingIdNumber) errors.push("ç¼ºå°‘ç›¸å¯¹æ–¹è¯ä»¶å·");

  const categoryText = get("category");
  const category = parseCategoryLabel(categoryText);
  if (!categoryText) errors.push("ç¼ºå°‘Casoç±»åž‹");
  else if (!category) errors.push(`Casoç±»åž‹ã€Œ${categoryText}ã€æ— æ³•è¯†åˆ«`);

  const statusText = get("status");
  const status = parseStatusLabel(statusText);
  if (!statusText) errors.push("ç¼ºå°‘CasoEstado");
  else if (!status)
    errors.push(`CasoEstadoã€Œ${statusText}ã€æ— æ³•è¯†åˆ«ï¼ˆåŠžç†ä¸­/å·²Cerrar caso/å·²å½’æ¡£ï¼‰`);

  const intakeText = get("intakeDate");
  let intakeDate: Date | null = null;
  if (intakeText) {
    intakeDate = parseImportDate(intakeText);
    if (!intakeDate)
      errors.push(`æ”¶æ¡ˆFechaã€Œ${intakeText}ã€æ ¼å¼åº”ä¸º YYYY-MM-DD`);
  }

  const amountText = get("claimAmount");
  let claimAmount: number | null = null;
  if (amountText) {
    claimAmount = parseAmount(amountText);
    if (claimAmount === null)
      errors.push(`æ ‡çš„é¢ã€Œ${amountText}ã€ä¸æ˜¯æœ‰æ•ˆæ•°å­—`);
  }

  if (errors.length > 0 || !category || !status) {
    return { errors, normalized: null };
  }

  const ownerEmail = get("ownerEmail") || null;
  const causeText = get("cause") || null;
  const jurisdiction = get("jurisdiction") || null;
  const clientPhone = get("clientPhone") || null;

  return {
    errors,
    normalized: {
      clientName,
      clientIdNumber,
      clientType: parseClientType(get("clientType")),
      clientPhone,
      opposingName,
      opposingIdNumber,
      opposingPartyType: parsePartyType(get("opposingType")),
      clientPartyType: parsePartyType(get("clientType")),
      category,
      status,
      ownerEmail,
      intakeDate,
      causeText,
      claimAmount,
      jurisdiction,
    },
  };
}

