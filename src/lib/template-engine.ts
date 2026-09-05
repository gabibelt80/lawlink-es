/**
 * v0.8 æ–‡æ¡£æ¨¡æ¿å¼•æ“Ž
 *
 * æµç¨‹ï¼š
 *   1. buildContext(matterId, userId, overrides?) ä»Ž DB æ‹¼è£…å˜é‡ä¸Šä¸‹æ–‡
 *   2. renderDocxBuffer(templateBuffer, context) ç”¨ docxtemplater æ¸²æŸ“
 *   3. æ¸²æŸ“å‰ detectMissing(variables, context) æ‰¾å‡ºæœªå¡«å†™çš„å˜é‡ï¼Œç”± UI å¼¹çª—è¡¥å…¨
 *
 * æ¨¡æ¿å˜é‡ä½¿ç”¨åŒå¤§æ‹¬å·è¯­æ³•ï¼š{{firm.name}} / {{client.idNumber}}ã€‚
 */
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { prisma } from "./prisma";

const FIRM_NAME_KEY = "firmName";
const FIRM_ADDRESS_KEY = "firmAddress";
const FIRM_PHONE_KEY = "firmPhone";

export interface PartySnapshot {
  name: string;
  idNumber: string;
  phone: string;
  address: string;
  legalRep: string;
}

export interface RenderContext {
  firm: { name: string; address: string; phone: string };
  today: string; // YYYY-MM-DD
  todayCN: string; // äºŒã€‡äºŒå…­å¹´MayoäºŒåä¸‰æ—¥
  lawyer: { name: string; phone: string };
  matter: {
    code: string;
    title: string;
    category: string;
    causeText: string;
    intakeDate: string;
    claimAmount: string; // ä¸­æ–‡Monto / "â€”"
    ourStanding: string;
  };
  client: PartySnapshot;
  opposing: PartySnapshot; // ç¬¬ä¸€ä¸ªå¯¹æ–¹
  third: PartySnapshot; // ç¬¬ä¸€ä¸ªç¬¬ä¸‰äºº
  proceeding: { type: string; caseNo: string; court: string };
  // æ•°ç»„å¾ªçŽ¯ç”¨
  plaintiffs: PartySnapshot[];
  defendants: PartySnapshot[];
  thirds: PartySnapshot[];
  [extra: string]: unknown;
}

const EMPTY_PARTY: PartySnapshot = {
  name: "",
  idNumber: "",
  phone: "",
  address: "",
  legalRep: ""
};

const STANDING_CN: Record<string, string> = {
  PLAINTIFF: "åŽŸå‘Š",
  JOINT_PLAINTIFF: "å…±åŒåŽŸå‘Š",
  DEFENDANT: "è¢«å‘Š",
  JOINT_DEFENDANT: "å…±åŒè¢«å‘Š",
  THIRD_PARTY: "ç¬¬ä¸‰äºº",
  APPELLANT: "ä¸Šè¯‰äºº",
  APPELLEE: "è¢«ä¸Šè¯‰äºº",
  RETRIAL_APPLICANT: "å†å®¡ç”³è¯·äºº",
  RETRIAL_RESPONDENT: "å†å®¡è¢«ç”³è¯·äºº",
  ENFORCEMENT_APPLICANT: "ç”³è¯·æ‰§è¡Œäºº",
  EXECUTED_PERSON: "è¢«æ‰§è¡Œäºº",
  COUNTERCLAIM_PLAINTIFF: "åè¯‰åŽŸå‘Š",
  COUNTERCLAIM_DEFENDANT: "åè¯‰è¢«å‘Š",
  CRIMINAL_DEFENDANT: "è¢«å‘Šäºº",
  CRIMINAL_VICTIM: "è¢«å®³äºº",
  PRIVATE_PROSECUTOR: "è‡ªè¯‰äºº",
  CRIMINAL_INCIDENTAL_PLAINTIFF: "é™„å¸¦æ°‘äº‹è¯‰è®¼åŽŸå‘Šäºº",
  ARBITRATION_CLAIMANT: "ä»²è£ç”³è¯·äºº",
  ARBITRATION_RESPONDENT: "ä»²è£è¢«ç”³è¯·äºº",
  ADMIN_PLAINTIFF: "Administrativoè¯‰è®¼åŽŸå‘Š",
  ADMIN_DEFENDANT: "Administrativoè¯‰è®¼è¢«å‘Š",
  ADMIN_RECONSIDERATION_APPLICANT: "Administrativoå¤è®®ç”³è¯·äºº",
  ADMIN_RECONSIDERATION_RESPONDENT: "Administrativoå¤è®®è¢«ç”³è¯·äºº",
  NON_LITIGATION_PARTY: "Ã­temsç›®å½“äº‹äºº"
};

const CATEGORY_CN: Record<string, string> = {
  CIVIL_COMMERCIAL: "Civil/Comercial",
  CRIMINAL: "Penal",
  ADMINISTRATIVE: "Administrativo",
  NON_LITIGATION: "éžè¯‰",
  LEGAL_COUNSEL: "æ³•å¾‹é¡¾é—®",
  SPECIAL_PROJECT: "ä¸“Ã­temsæ³•å¾‹æœåŠ¡"
};

function toCNDate(d: Date): string {
  const cnDigits = "ã€‡ä¸€äºŒä¸‰å››äº”å…­ä¸ƒå…«ä¹";
  const y = String(d.getFullYear()).split("").map((c) => cnDigits[+c]).join("");
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const cnNum = (n: number) => {
    if (n <= 10) return ["ã€‡", "ä¸€", "äºŒ", "ä¸‰", "å››", "äº”", "å…­", "ä¸ƒ", "å…«", "ä¹", "å"][n];
    if (n < 20) return "å" + cnDigits[n - 10];
    if (n < 30) return "äºŒå" + (n === 20 ? "" : cnDigits[n - 20]);
    return "ä¸‰å" + (n === 30 ? "" : cnDigits[n - 30]);
  };
  return `${y}å¹´${cnNum(m)}æœˆ${cnNum(day)}æ—¥`;
}

function partyToSnapshot(p: {
  name: string;
  idNumber: string | null;
  phone: string | null;
  address: string | null;
  legalRep: string | null;
}): PartySnapshot {
  return {
    name: p.name,
    idNumber: p.idNumber ?? "",
    phone: p.phone ?? "",
    address: p.address ?? "",
    legalRep: p.legalRep ?? ""
  };
}

async function getFirmInfo(): Promise<{ name: string; address: string; phone: string }> {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: [FIRM_NAME_KEY, FIRM_ADDRESS_KEY, FIRM_PHONE_KEY] } }
  });
  const dict = new Map(rows.map((r) => [r.key, (r.value as { value?: string })?.value ?? ""]));
  return {
    name: dict.get(FIRM_NAME_KEY) || "LawLink Abogadoäº‹åŠ¡æ‰€",
    address: dict.get(FIRM_ADDRESS_KEY) || "",
    phone: dict.get(FIRM_PHONE_KEY) || ""
  };
}

/**
 * åº”ç”¨ overridesï¼ˆæ¥è‡ª UI çš„è¡Œå†…è¡¥å…¨ï¼‰ï¼Œè·¯å¾„é”®å¦‚ "client.idNumber" å†™å›žæºè¡¨ã€‚
 * æ³¨æ„ï¼šåªå›žå†™ v0.8 é«˜é¢‘ç¼ºå¤±å­—æ®µï¼ˆclient.idNumber / client.address / opposing.idNumber etc.ï¼‰ã€‚
 * å…¶ä»–å­—æ®µä¸€å¾‹å¿½ç•¥ï¼Œé¿å…è¯¯Accionesã€‚
 */
async function applyOverrides(matterId: string | undefined, overrides: Record<string, string>) {
  if (!matterId) return;
  const matter = await prisma.matter.findUnique({
    where: { id: matterId },
    select: { primaryClientId: true }
  });
  if (!matter) return;

  // client.* â†’ Client è¡¨
  if (matter.primaryClientId) {
    const clientPatch: Record<string, string> = {};
    if (overrides["client.idNumber"]) clientPatch.idNumber = overrides["client.idNumber"];
    if (overrides["client.address"]) clientPatch.address = overrides["client.address"];
    if (overrides["client.phone"]) clientPatch.phone = overrides["client.phone"];
    if (Object.keys(clientPatch).length > 0) {
      await prisma.client.update({
        where: { id: matter.primaryClientId },
        data: clientPatch
      });
    }
  }

  // opposing.* â†’ ç¬¬ä¸€ä¸ª OPPOSING_PARTY
  const opposingPatch: Record<string, string> = {};
  if (overrides["opposing.idNumber"]) opposingPatch.idNumber = overrides["opposing.idNumber"];
  if (overrides["opposing.address"]) opposingPatch.address = overrides["opposing.address"];
  if (overrides["opposing.phone"]) opposingPatch.phone = overrides["opposing.phone"];
  if (Object.keys(opposingPatch).length > 0) {
    const opp = await prisma.party.findFirst({
      where: { matterId, role: "OPPOSING_PARTY" },
      orderBy: { ordinal: "asc" },
      select: { id: true }
    });
    if (opp) {
      await prisma.party.update({ where: { id: opp.id }, data: opposingPatch });
    }
  }
}

export async function buildContext(opts: {
  matterId?: string;
  userId: string;
  overrides?: Record<string, string>;
}): Promise<RenderContext> {
  if (opts.matterId && opts.overrides && Object.keys(opts.overrides).length > 0) {
    await applyOverrides(opts.matterId, opts.overrides);
  }

  const today = new Date();
  const firm = await getFirmInfo();
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { name: true, phone: true }
  });

  if (!opts.matterId) {
    return {
      firm,
      today: today.toISOString().slice(0, 10),
      todayCN: toCNDate(today),
      lawyer: { name: user?.name ?? "", phone: user?.phone ?? "" },
      matter: {
        code: "",
        title: "",
        category: "",
        causeText: "",
        intakeDate: "",
        claimAmount: "â€”",
        ourStanding: ""
      },
      client: EMPTY_PARTY,
      opposing: EMPTY_PARTY,
      third: EMPTY_PARTY,
      proceeding: { type: "", caseNo: "", court: "" },
      plaintiffs: [],
      defendants: [],
      thirds: []
    };
  }

  const matter = await prisma.matter.findUnique({
    where: { id: opts.matterId },
    include: {
      cause: { select: { name: true } },
      primaryClient: true,
      parties: { orderBy: [{ role: "asc" }, { ordinal: "asc" }] },
      procedures: { orderBy: { order: "asc" }, where: { engagement: "ENGAGED" }, take: 1 }
    }
  });
  if (!matter) throw new Error("Casoä¸å­˜åœ¨");

  const causeText = matter.cause?.name ?? matter.causeFreeText ?? "";
  const clientParty = matter.primaryClient
    ? {
        name: matter.primaryClient.name,
        idNumber: matter.primaryClient.idNumber ?? "",
        phone: matter.primaryClient.phone ?? "",
        address: matter.primaryClient.address ?? "",
        legalRep: ""
      }
    : EMPTY_PARTY;

  const opposingParties = matter.parties
    .filter((p) => p.role === "OPPOSING_PARTY")
    .map(partyToSnapshot);
  const thirdParties = matter.parties
    .filter((p) => p.role === "THIRD_PARTY")
    .map(partyToSnapshot);
  const clientPartiesFromParty = matter.parties
    .filter((p) => p.role === "CLIENT_PARTY")
    .map(partyToSnapshot);

  // æ ¹æ® standing åŒºåˆ† plaintiff / defendantï¼ˆå…œåº•æŒ‰ roleï¼‰
  const plaintiffs = clientPartiesFromParty.length > 0 ? clientPartiesFromParty : [clientParty];
  const defendants = opposingParties;

  const firstProc = matter.procedures[0];

  return {
    firm,
    today: today.toISOString().slice(0, 10),
    todayCN: toCNDate(today),
    lawyer: { name: user?.name ?? "", phone: user?.phone ?? "" },
    matter: {
      code: matter.internalCode,
      title: matter.title,
      category: CATEGORY_CN[matter.category] ?? matter.category,
      causeText,
      intakeDate: matter.intakeDate ? matter.intakeDate.toISOString().slice(0, 10) : "",
      claimAmount: matter.claimAmount ? `${matter.claimAmount} pesos` : "â€”",
      ourStanding: matter.ourStanding ? STANDING_CN[matter.ourStanding] ?? matter.ourStanding : ""
    },
    client: clientParty,
    opposing: opposingParties[0] ?? EMPTY_PARTY,
    third: thirdParties[0] ?? EMPTY_PARTY,
    proceeding: {
      type: firstProc?.type ?? "",
      caseNo: firstProc?.caseNumber ?? "",
      court: firstProc?.handlingAgency ?? ""
    },
    plaintiffs,
    defendants,
    thirds: thirdParties
  };
}

/**
 * docxtemplater é”™è¯¯ç»“æž„ï¼ˆErrors[].properties.explanation å«å…·ä½“ tagï¼‰ã€‚
 * ç”¨ç±»åž‹æ–­è¨€è¯»å–ï¼Œé¿å…å¼•å…¥é¢å¤–ä¾èµ–ã€‚
 */
interface DocxTagError {
  message?: string;
  properties?: {
    id?: string;
    explanation?: string;
    xtag?: string;
    file?: string;
  };
}

interface DocxMultiError extends Error {
  properties?: {
    errors?: DocxTagError[];
    id?: string;
    explanation?: string;
  };
}

function formatDocxError(err: unknown): string {
  if (!err || typeof err !== "object") return String(err);
  const e = err as DocxMultiError;
  const items = e.properties?.errors ?? [e as unknown as DocxTagError];
  const lines: string[] = [];
  for (const it of items) {
    const tag = it.properties?.xtag ?? it.properties?.id ?? "?";
    const reason = it.properties?.explanation ?? it.message ?? "Desconocido";
    lines.push(`[${tag}] ${reason}`);
  }
  return lines.join("\n");
}

/**
 * æ¸²æŸ“ docxï¼šä¼ å…¥æ¨¡æ¿ Buffer + ä¸Šä¸‹æ–‡ â†’ Volverå¡«å……åŽçš„ Bufferã€‚
 * æ¨¡æ¿ç”¨ {{var}} è¯­æ³•ï¼ˆåŒå¤§æ‹¬å·ï¼‰ï¼Œé¿å…y docx å†…åµŒ "{" å†²çªã€‚
 *
 * å‡ºé”™æ—¶æŠ›å‡ºå«å…·ä½“ tag / Motivoçš„ä¸­æ–‡å¼‚å¸¸ï¼Œæ–¹ä¾¿Abogadoå®šä½æ˜¯å“ªä¸ªæ¨¡æ¿å­—æ®µåäº†ã€‚
 */
export function renderDocxBuffer(
  templateBuffer: Buffer,
  context: RenderContext
): Buffer {
  let zip: PizZip;
  try {
    zip = new PizZip(templateBuffer);
  } catch (err) {
    throw new Error(`æ¨¡æ¿æ–‡ä»¶æŸåï¼Œæ— æ³•è§£åŽ‹ï¼š${err instanceof Error ? err.message : String(err)}`);
  }

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" }
  });

  try {
    doc.render(context as unknown as Record<string, unknown>);
  } catch (err) {
    throw new Error(`æ¨¡æ¿æ¸²æŸ“Errorï¼š\n${formatDocxError(err)}`);
  }

  return doc.getZip().generate({ type: "nodebuffer" }) as Buffer;
}

/**
 * æ£€æŸ¥ä¸Šä¸‹æ–‡ä¸­å“ªäº›å˜é‡ä¸ºç©ºï¼ŒVolverç¼ºå¤±å˜é‡è·¯å¾„åˆ—è¡¨ï¼ˆUI å¼¹çª—ç”¨ï¼‰ã€‚
 * @param required æ¨¡æ¿å£°æ˜Žçš„å˜é‡æ¸…å•ï¼ˆDocumentTemplate.variablesï¼‰
 */
export function detectMissing(required: string[], context: RenderContext): string[] {
  const missing: string[] = [];
  for (const path of required) {
    const val = readPath(context, path);
    if (val === undefined || val === null || String(val).trim() === "") {
      missing.push(path);
    }
  }
  return missing;
}

function readPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

