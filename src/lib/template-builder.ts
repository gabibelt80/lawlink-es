/**
 * v0.8 å†…ç½® 8 ä¸ªå¼€æºæ¨¡æ¿çš„ docx æ–‡ä»¶åŠ¨æ€ç”Ÿæˆï¼ˆé¦–æ‰¹ â˜… æ¨¡æ¿ï¼‰
 *
 * ç”¨ docx åº“æž„é€  docx Bufferï¼Œdocxtemplater å ä½ç¬¦ä½¿ç”¨ {{var}} è¯­æ³•ã€‚
 * å¾‹æ‰€éƒ¨ç½²åŽå¯åœ¨ /settings/templates ä¸Šä¼ è‡ªå®šä¹‰æ¨¡æ¿æ›¿æ¢ã€‚
 *
 * 8 ä¸ªï¼š
 *   1. æ°‘äº‹Casoæ”¶æ¡ˆç™»è®°è¡¨
 *   2. PenalCasoæ”¶æ¡ˆç™»è®°è¡¨
 *   3. æ³•å¾‹æœåŠ¡é£Žé™©å‘ŠçŸ¥ä¹¦
 *   4. å§”æ‰˜ä»£ç†åˆåŒï¼ˆä¸ªäººï¼‰
 *   5. å§”æ‰˜ä»£ç†åˆåŒï¼ˆå•ä½ï¼‰
 *   6. æŽˆæƒå§”æ‰˜ä¹¦ï¼ˆä¸ªäººï¼‰
 *   7. æ°‘äº‹èµ·è¯‰çŠ¶
 *   8. æ°‘äº‹ç­”è¾©çŠ¶
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  HeadingLevel,
  WidthType,
  BorderStyle,
  PageNumber,
  PageOrientation,
  type ISectionOptions
} from "docx";
import type { MatterCategory, TemplateCategory } from "@prisma/client";

export interface BuiltInTemplateMeta {
  key: string; // å”¯ä¸€ç¨³å®š keyï¼ˆseed ç”¨ upsertï¼‰
  name: string;
  category: TemplateCategory;
  description: string;
  applicableCategories: MatterCategory[];
  variables: string[];
}

export interface BuiltInTemplate extends BuiltInTemplateMeta {
  buildBuffer: () => Promise<Buffer>;
}

// ============================================================
// è¾…åŠ©
// ============================================================
export const FONT_TITLE = "SimHei";
export const FONT_BODY = "FangSong";

export function title(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 120, after: 240 },
    children: [
      new TextRun({ text, font: FONT_TITLE, size: 40, bold: true })
    ]
  });
}

export function body(text: string, opts?: { indent?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; bold?: boolean }): Paragraph {
  return new Paragraph({
    alignment: opts?.align ?? AlignmentType.LEFT,
    spacing: { before: 60, after: 60, line: 360 },
    indent: opts?.indent ? { firstLine: 480 } : undefined,
    children: [new TextRun({ text, font: FONT_BODY, size: 24, bold: opts?.bold })]
  });
}

export function blank(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: "" })], spacing: { before: 60, after: 60 } });
}

function kvRow(k: string, v: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: k, font: FONT_BODY, size: 22, bold: true })]
          })
        ]
      }),
      new TableCell({
        width: { size: 75, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [new TextRun({ text: v, font: FONT_BODY, size: 22 })]
          })
        ]
      })
    ]
  });
}

export function kvTable(rows: [string, string][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "BBBBBB" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "BBBBBB" }
    },
    rows: rows.map(([k, v]) => kvRow(k, v))
  });
}

function sectionDefaults(children: (Paragraph | Table)[]): ISectionOptions {
  return {
    properties: {
      page: {
        size: { orientation: PageOrientation.PORTRAIT },
        margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } // 2cm
      }
    },
    headers: undefined,
    footers: {
      default: undefined
    },
    children: [
      ...children,
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
        children: [
          new TextRun({ text: "â€” ", font: FONT_BODY, size: 18, color: "999999" }),
          new TextRun({ children: [PageNumber.CURRENT], font: FONT_BODY, size: 18, color: "999999" }),
          new TextRun({ text: " â€”", font: FONT_BODY, size: 18, color: "999999" })
        ]
      })
    ]
  };
}

export async function pack(children: (Paragraph | Table)[]): Promise<Buffer> {
  const doc = new Document({
    creator: "LawLink",
    title: "LawLink æ¨¡æ¿",
    sections: [sectionDefaults(children)]
  });
  return Packer.toBuffer(doc);
}

// ============================================================
// æ¨¡æ¿ 1: æ°‘äº‹Casoæ”¶æ¡ˆç™»è®°è¡¨
// ============================================================
const T1_VARS = [
  "firm.name",
  "matter.code",
  "matter.intakeDate",
  "matter.causeText",
  "matter.claimAmount",
  "client.name",
  "client.address",
  "client.phone",
  "opposing.name",
  "opposing.address",
  "proceeding.court",
  "lawyer.name",
  "todayCN"
];

async function buildT1(): Promise<Buffer> {
  return pack([
    body("{{firm.name}}", { align: AlignmentType.CENTER, bold: true }),
    title("æ°‘äº‹Casoæ”¶æ¡ˆç™»è®°è¡¨"),
    body("Casoç¼–å·ï¼š{{matter.code}}", { align: AlignmentType.RIGHT }),
    blank(),
    kvTable([
      ["æ”¶æ¡ˆFecha", "{{matter.intakeDate}}"],
      ["Causa", "{{matter.causeText}}"],
      ["Casoç±»åž‹", "æ°‘äº‹Caso"],
      ["å§”æ‰˜äºº", "{{client.name}}"],
      ["å§”æ‰˜äººä½å€", "{{client.address}}"],
      ["è”ç³»ç”µè¯", "{{client.phone}}"],
      ["å¯¹æ–¹å½“äº‹äºº", "{{opposing.name}}"],
      ["å¯¹æ–¹ä½å€", "{{opposing.address}}"],
      ["å—ç†æ³•é™¢", "{{proceeding.court}}"],
      ["æ¶‰æ¡ˆæ ‡çš„", "{{matter.claimAmount}}"],
      ["ä¸»åŠžAbogado", "{{lawyer.name}}"]
    ]),
    blank(),
    body("ç™»è®°Fechaï¼š{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// æ¨¡æ¿ 2: PenalCasoæ”¶æ¡ˆç™»è®°è¡¨
// ============================================================
const T2_VARS = [
  "firm.name",
  "matter.code",
  "matter.intakeDate",
  "matter.causeText",
  "client.name",
  "client.phone",
  "opposing.name",
  "opposing.address",
  "lawyer.name",
  "todayCN"
];

async function buildT2(): Promise<Buffer> {
  return pack([
    body("{{firm.name}}", { align: AlignmentType.CENTER, bold: true }),
    title("PenalCasoæ”¶æ¡ˆç™»è®°è¡¨"),
    body("Casoç¼–å·ï¼š{{matter.code}}", { align: AlignmentType.RIGHT }),
    blank(),
    kvTable([
      ["æ”¶æ¡ˆFecha", "{{matter.intakeDate}}"],
      ["æ¶‰å«Œç½ªå", "{{matter.causeText}}"],
      ["å§”æ‰˜äºº(å®¶å±ž)", "{{client.name}}"],
      ["yè¢«å‘Šäººå…³ç³»", ""],
      ["è”ç³»ç”µè¯", "{{client.phone}}"],
      ["è¢«å‘ŠäººNombre y apellido", "{{opposing.name}}"],
      ["ç¾æŠ¼/å±…æ‰€åœ°ç‚¹", "{{opposing.address}}"],
      ["Casoé˜¶æ®µ", "ä¾¦æŸ¥ / å®¡æŸ¥èµ·è¯‰ / ä¸€å®¡ / äºŒå®¡ / å†å®¡"],
      ["åŠžç†æœºå…³", ""],
      ["ä¸»åŠžAbogado", "{{lawyer.name}}"]
    ]),
    blank(),
    body("ç™»è®°Fechaï¼š{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// æ¨¡æ¿ 3: æ³•å¾‹æœåŠ¡é£Žé™©å‘ŠçŸ¥ä¹¦
// ============================================================
const T3_VARS = ["firm.name", "client.name", "matter.causeText", "lawyer.name", "todayCN"];

async function buildT3(): Promise<Buffer> {
  return pack([
    title("æ³•å¾‹æœåŠ¡é£Žé™©å‘ŠçŸ¥ä¹¦"),
    body("è‡´ï¼š{{client.name}}", { bold: true }),
    blank(),
    body(
      "æœ¬æ‰€yæœ¬æ‰€Abogadoåœ¨æŽ¥å—æ‚¨çš„å§”æ‰˜åŠžç† {{matter.causeText}} ä¸€æ¡ˆå‰ï¼Œä¾æ®ã€ŠAbogadoæ³•ã€‹ã€ŠAbogadoæ‰§ä¸šè¡Œä¸ºè§„èŒƒã€‹etc.ç›¸å…³è§„å®šï¼Œå°†ä»¥ä¸‹æ³•å¾‹æœåŠ¡é£Žé™©äº‹Ã­temsæ˜Žç¡®å‘ŠçŸ¥æ‚¨ï¼Œè¯·ä»”ç»†é˜…è¯»ï¼š",
      { indent: true }
    ),
    blank(),
    body("ä¸€ã€æ³•å¾‹æœåŠ¡ç»“æžœçš„ä¸Aceptaræ€§ã€‚æ³•å¾‹äº‹åŠ¡çš„å¤„ç†å—Casoäº‹å®žã€è¯æ®ã€æ³•å¾‹é€‚ç”¨ã€å¸æ³•è£é‡ã€å¯¹æ–¹å½“äº‹äººè¡Œä¸ºetc.å¤šç§å› ç´ å½±å“ï¼ŒAbogadoæ— æ³•æ‰¿è¯ºä»»ä½•Aceptarçš„ç»“æžœã€‚", { indent: true }),
    body("äºŒã€Casoç»“æžœä¸å–å†³äºŽä»£ç†è´¹Montoã€‚Abogadoæ”¶è´¹yåŠžæ¡ˆæŠ•å…¥ç›¸å…³ï¼Œyè¯‰è®¼ç»“æžœæ— å¯¹åº”å…³ç³»ã€‚", { indent: true }),
    body("ä¸‰ã€è¯æ®ææ–™çš„çœŸå®žæ€§è´£ä»»ã€‚å§”æ‰˜äººæä¾›çš„è¯æ®ææ–™é¡»çœŸå®žã€åˆæ³•ã€‚å¦‚å› è¯æ®è™šå‡æˆ–ç‘•ç–µå¯¼è‡´ä¸åˆ©åŽæžœï¼Œç”±å§”æ‰˜äººè‡ªè¡Œæ‰¿æ‹…ã€‚", { indent: true }),
    body("å››ã€è¯‰è®¼æ—¶æ•ˆyä¸¾è¯Plazoã€‚å§”æ‰˜äººåº”å½“åœ¨æ³•å¾‹è§„å®šçš„è¯‰è®¼æ—¶æ•ˆå†…ä¸»å¼ æƒåˆ©ï¼Œåœ¨ä¸¾è¯Plazoå†…EnviarVer todosè¯æ®ï¼ŒVencidoå¯èƒ½ä¸§å¤±ç›¸åº”æƒåˆ©ã€‚", { indent: true }),
    body("äº”ã€åˆ¤å†³çš„æ‰§è¡Œé£Žé™©ã€‚å³ä½¿èŽ·å¾—èƒœè¯‰åˆ¤å†³ï¼Œå› å¯¹æ–¹å±¥è¡Œèƒ½åŠ›etc.Motivoï¼Œä»å¯èƒ½å­˜åœ¨æ‰§è¡Œä¸èƒ½æˆ–æ‰§è¡Œä¸åˆ°ä½çš„é£Žé™©ã€‚", { indent: true }),
    body("å…­ã€å’Œè§£yè°ƒè§£çš„å¯èƒ½æ€§ã€‚Abogadoå°†æ ¹æ®Casoæƒ…å†µè¯„ä¼°å’Œè§£ã€è°ƒè§£æ–¹æ¡ˆï¼Œæ˜¯å¦æŽ¥å—ç”±å§”æ‰˜äººæœ€ç»ˆå†³å®šã€‚", { indent: true }),
    body("ä¸ƒã€å…¶ä»–äº‹Ã­temsã€‚", { indent: true }),
    blank(),
    body("å§”æ‰˜äºº(ç­¾å­—)ï¼š________________"),
    blank(),
    body("æ‰¿åŠžAbogadoï¼š{{lawyer.name}}"),
    body("Abogadoäº‹åŠ¡æ‰€ï¼š{{firm.name}}"),
    body("å‘ŠçŸ¥Fechaï¼š{{todayCN}}")
  ]);
}

// ============================================================
// æ¨¡æ¿ 4: å§”æ‰˜ä»£ç†åˆåŒï¼ˆä¸ªäººï¼‰
// ============================================================
const T4_VARS = [
  "firm.name",
  "firm.address",
  "firm.phone",
  "client.name",
  "client.idNumber",
  "client.address",
  "client.phone",
  "matter.causeText",
  "lawyer.name",
  "todayCN"
];

async function buildT4(): Promise<Buffer> {
  return pack([
    title("å§”æ‰˜ä»£ç†åˆåŒ"),
    body("(é€‚ç”¨äºŽè‡ªç„¶äººå§”æ‰˜)"),
    blank(),
    body("ç”²æ–¹(å§”æ‰˜äºº)ï¼š{{client.name}}"),
    body("èº«ä»½è¯å·ï¼š{{client.idNumber}}"),
    body("ä½å€ï¼š{{client.address}}"),
    body("è”ç³»ç”µè¯ï¼š{{client.phone}}"),
    blank(),
    body("ä¹™æ–¹(å—æ‰˜äºº)ï¼š{{firm.name}}"),
    body("åœ°å€ï¼š{{firm.address}}"),
    body("ç”µè¯ï¼š{{firm.phone}}"),
    blank(),
    body("ç”²ä¹™åŒæ–¹æ ¹æ®ã€Šä¸­åŽäººæ°‘å…±å’Œå›½æ°‘æ³•å…¸ã€‹ã€Šä¸­åŽäººæ°‘å…±å’Œå›½Abogadoæ³•ã€‹ä¹‹è§„å®šï¼Œç»åå•†ä¸€è‡´ï¼Œç­¾è®¢æœ¬å§”æ‰˜ä»£ç†åˆåŒï¼š", { indent: true }),
    blank(),
    body("ç¬¬ä¸€æ¡ å§”æ‰˜äº‹Ã­temsyä»£ç†æƒé™", { bold: true }),
    body("ç”²æ–¹å§”æ‰˜ä¹™æ–¹æŒ‡æ´¾Abogadoå°± {{matter.causeText}} ä¸€æ¡ˆä¸ºç”²æ–¹æä¾›æ³•å¾‹æœåŠ¡ã€‚ä»£ç†æƒé™ä¸ºï¼š________________(ä¸€èˆ¬ä»£ç† / ç‰¹åˆ«ä»£ç†ï¼šåŒ…æ‹¬ä»£ä¸ºæ‰¿è®¤ã€æ”¾å¼ƒã€å˜æ›´è¯‰è®¼è¯·æ±‚ï¼Œä»£ä¸ºå’Œè§£ï¼Œä»£ä¸ºæèµ·åè¯‰æˆ–ä¸Šè¯‰etc.)ã€‚", { indent: true }),
    blank(),
    body("ç¬¬äºŒæ¡ å§”æ‰˜ä»£ç†äº‹Ã­temsçš„èŒƒå›´", { bold: true }),
    body("(ä¸€å®¡ / äºŒå®¡ / å†å®¡ / ä»²è£ / æ‰§è¡Œ)", { indent: true }),
    blank(),
    body("ç¬¬ä¸‰æ¡ Abogadoè´¹yæ”¯ä»˜æ–¹å¼", { bold: true }),
    body("ä»£ç†è´¹Montoï¼šäººæ°‘å¸________pesos(å¤§å†™ï¼š________________pesosæ•´)ã€‚", { indent: true }),
    body("æ”¯ä»˜æ–¹å¼ï¼š________________ã€‚", { indent: true }),
    blank(),
    body("ç¬¬å››æ¡ å…¶ä»–Gastos", { bold: true }),
    body("CasoåŠžç†è¿‡ç¨‹ä¸­äº§ç”Ÿçš„è¯‰è®¼è´¹ã€PreservaciÃ³nè´¹ã€é‰´å®šè´¹ã€å·®æ—…è´¹etc.ï¼Œç”±ç”²æ–¹å¦è¡Œæ‰¿æ‹…ã€‚", { indent: true }),
    blank(),
    body("ç¬¬äº”æ¡ åŒæ–¹æƒåˆ©ä¹‰åŠ¡", { bold: true }),
    body("ç•¥", { indent: true }),
    blank(),
    body("ç¬¬å…­æ¡ åˆåŒçš„è§£é™¤yç»ˆæ­¢", { bold: true }),
    body("ç•¥", { indent: true }),
    blank(),
    body("ç¬¬ä¸ƒæ¡ äº‰è®®è§£å†³", { bold: true }),
    body("å› æœ¬åˆåŒå‘ç”Ÿçš„äº‰è®®ï¼Œç”±åŒæ–¹åå•†è§£å†³ï¼›åå•†ä¸æˆçš„ï¼ŒEnviarä¹™æ–¹æ‰€åœ¨åœ°æœ‰ç®¡è¾–æƒçš„äººæ°‘æ³•é™¢è¯‰è®¼è§£å†³ã€‚", { indent: true }),
    blank(),
    body("æœ¬åˆåŒä¸€å¼ä¸¤ä»½ï¼Œç”²ä¹™åŒæ–¹å„æ‰§ä¸€ä»½ï¼Œè‡ªåŒæ–¹ç­¾å­—ç›–ç« ä¹‹æ—¥èµ·ç”Ÿæ•ˆã€‚", { indent: true }),
    blank(),
    blank(),
    body("ç”²æ–¹(ç­¾å­—)ï¼š________________            ä¹™æ–¹(ç›–ç« )ï¼š"),
    blank(),
    body("                                            æ‰¿åŠžAbogadoï¼š{{lawyer.name}}"),
    blank(),
    body("ç­¾è®¢Fechaï¼š{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// æ¨¡æ¿ 5: å§”æ‰˜ä»£ç†åˆåŒï¼ˆå•ä½ï¼‰
// ============================================================
const T5_VARS = [
  "firm.name",
  "firm.address",
  "firm.phone",
  "client.name",
  "client.idNumber",
  "client.address",
  "client.phone",
  "matter.causeText",
  "lawyer.name",
  "todayCN"
];

async function buildT5(): Promise<Buffer> {
  return pack([
    title("å§”æ‰˜ä»£ç†åˆåŒ"),
    body("(é€‚ç”¨äºŽæ³•äººæˆ–éžæ³•äººç»„ç»‡å§”æ‰˜)"),
    blank(),
    body("ç”²æ–¹(å§”æ‰˜äºº)ï¼š{{client.name}}"),
    body("ç»Ÿä¸€ç¤¾ä¼šä¿¡ç”¨ä»£ç ï¼š{{client.idNumber}}"),
    body("ä½æ‰€åœ°ï¼š{{client.address}}"),
    body("æ³•å®šä»£è¡¨äºº/è´Ÿè´£äººï¼š________________"),
    body("è”ç³»ç”µè¯ï¼š{{client.phone}}"),
    blank(),
    body("ä¹™æ–¹(å—æ‰˜äºº)ï¼š{{firm.name}}"),
    body("åœ°å€ï¼š{{firm.address}}"),
    body("ç”µè¯ï¼š{{firm.phone}}"),
    blank(),
    body("ç”²ä¹™åŒæ–¹å°±ä»¥ä¸‹äº‹Ã­temsç­¾è®¢æœ¬å§”æ‰˜ä»£ç†åˆåŒï¼š", { indent: true }),
    blank(),
    body("ç¬¬ä¸€æ¡ å§”æ‰˜äº‹Ã­tems", { bold: true }),
    body("ç”²æ–¹å§”æ‰˜ä¹™æ–¹æŒ‡æ´¾Abogadoå°± {{matter.causeText}} ä¸€æ¡ˆä¸ºç”²æ–¹æä¾›æ³•å¾‹æœåŠ¡ã€‚", { indent: true }),
    blank(),
    body("ç¬¬äºŒæ¡ ä»£ç†æƒé™", { bold: true }),
    body("ç‰¹åˆ«ä»£ç†(å«ä»£ä¸ºæ‰¿è®¤ã€æ”¾å¼ƒã€å˜æ›´è¯‰è®¼è¯·æ±‚ï¼Œä»£ä¸ºå’Œè§£ï¼Œä»£ä¸ºæèµ·åè¯‰æˆ–ä¸Šè¯‰)ã€‚", { indent: true }),
    blank(),
    body("ç¬¬ä¸‰æ¡ Abogadoè´¹", { bold: true }),
    body("ä»£ç†è´¹Montoï¼šäººæ°‘å¸________pesos(å¤§å†™ï¼š________________pesosæ•´)ã€‚", { indent: true }),
    body("æ”¯ä»˜æ–¹å¼ï¼šåˆ†æœŸ / ä¸€æ¬¡æ€§ / é£Žé™©ä»£ç† / æŒ‰å°æ—¶è®¡è´¹ã€‚", { indent: true }),
    blank(),
    body("ç¬¬å››æ¡ å±¥è¡ŒæœŸé—´", { bold: true }),
    body("è‡ªæœ¬åˆåŒç­¾è®¢ä¹‹æ—¥èµ·è‡³æœ¬æ¡ˆä»£ç†äº‹Ã­temså¤„ç†å®Œæ¯•(å–å¾—ç”Ÿæ•ˆæ³•å¾‹æ–‡ä¹¦æˆ–åŒæ–¹ä¹¦é¢ç»ˆæ­¢)ã€‚", { indent: true }),
    blank(),
    body("ç¬¬äº”æ¡ ä¿å¯†æ¡æ¬¾", { bold: true }),
    body("ä¹™æ–¹å¯¹ç”²æ–¹æä¾›çš„MaterialyCasoä¿¡æ¯è´Ÿæœ‰ä¿å¯†ä¹‰åŠ¡ã€‚", { indent: true }),
    blank(),
    body("ç¬¬å…­æ¡ äº‰è®®è§£å†³", { bold: true }),
    body("åå•†ä¸æˆEnviarä¹™æ–¹æ‰€åœ¨åœ°æœ‰ç®¡è¾–æƒçš„äººæ°‘æ³•é™¢ã€‚", { indent: true }),
    blank(),
    blank(),
    body("ç”²æ–¹(ç›–ç« )ï¼š                                    ä¹™æ–¹(ç›–ç« )ï¼š"),
    blank(),
    body("æ³•å®šä»£è¡¨äºº/è´Ÿè´£äººï¼š________________              æ‰¿åŠžAbogadoï¼š{{lawyer.name}}"),
    blank(),
    body("ç­¾è®¢Fechaï¼š{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// æ¨¡æ¿ 6: æŽˆæƒå§”æ‰˜ä¹¦ï¼ˆä¸ªäººï¼‰
// ============================================================
const T6_VARS = [
  "client.name",
  "client.idNumber",
  "matter.causeText",
  "opposing.name",
  "lawyer.name",
  "firm.name",
  "todayCN"
];

async function buildT6(): Promise<Buffer> {
  return pack([
    title("æŽˆæƒå§”æ‰˜ä¹¦"),
    blank(),
    body("å§”æ‰˜äººï¼š{{client.name}}"),
    body("èº«ä»½è¯å·ï¼š{{client.idNumber}}"),
    blank(),
    body("å—å§”æ‰˜äººï¼š{{lawyer.name}}ï¼Œ{{firm.name}}Abogadoã€‚"),
    blank(),
    body("çŽ°å§”æ‰˜ä¸Šåˆ—å—å§”æ‰˜äººåœ¨æˆ‘y {{opposing.name}} {{matter.causeText}} ä¸€æ¡ˆä¸­ï¼Œä½œä¸ºæˆ‘çš„è¯‰è®¼ä»£ç†äººã€‚", { indent: true }),
    blank(),
    body("ä»£ç†æƒé™ä¸º(è¯·å‹¾é€‰)ï¼š", { bold: true }),
    body("â˜ ä¸€èˆ¬ä»£ç†ã€‚"),
    body("â˜ ç‰¹åˆ«ä»£ç†ã€‚åŒ…æ‹¬ï¼šä»£ä¸ºæ‰¿è®¤ã€æ”¾å¼ƒã€å˜æ›´è¯‰è®¼è¯·æ±‚ï¼›ä»£ä¸ºæèµ·åè¯‰ã€ä¸Šè¯‰ï¼›ä»£ä¸ºç”³è¯·æ‰§è¡Œï¼›ä»£ä¸ºå’Œè§£ã€è°ƒè§£ï¼›ä»£ä¸ºç­¾æ”¶æ³•å¾‹æ–‡ä¹¦ã€‚"),
    blank(),
    body("å§”æ‰˜Plazoï¼šè‡ªç­¾ç½²ä¹‹æ—¥èµ·è‡³æœ¬æ¡ˆä»£ç†äº‹Ã­temsç»ˆç»“ã€‚"),
    blank(),
    blank(),
    body("å§”æ‰˜äºº(ç­¾å­—æŒ‰å°)ï¼š________________"),
    blank(),
    body("å—å§”æ‰˜äºº(ç­¾å­—)ï¼š{{lawyer.name}}"),
    blank(),
    body("{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// æ¨¡æ¿ 7: æ°‘äº‹èµ·è¯‰çŠ¶
// ============================================================
const T7_VARS = [
  "client.name",
  "client.idNumber",
  "client.address",
  "client.phone",
  "opposing.name",
  "opposing.idNumber",
  "opposing.address",
  "matter.causeText",
  "matter.claimAmount",
  "proceeding.court",
  "lawyer.name",
  "todayCN"
];

async function buildT7(): Promise<Buffer> {
  return pack([
    title("æ°‘äº‹èµ·è¯‰çŠ¶"),
    blank(),
    body("åŽŸå‘Šï¼š{{client.name}}"),
    body("èº«ä»½è¯å·ï¼š{{client.idNumber}}"),
    body("ä½å€ï¼š{{client.address}}"),
    body("è”ç³»ç”µè¯ï¼š{{client.phone}}"),
    blank(),
    body("è¢«å‘Šï¼š{{opposing.name}}"),
    body("èº«ä»½è¯å· / ç»Ÿä¸€ç¤¾ä¼šä¿¡ç”¨ä»£ç ï¼š{{opposing.idNumber}}"),
    body("ä½å€ï¼š{{opposing.address}}"),
    blank(),
    body("Causaï¼š{{matter.causeText}}", { bold: true }),
    body("è¯‰è®¼æ ‡çš„Montoï¼š{{matter.claimAmount}}", { bold: true }),
    blank(),
    body("è¯‰è®¼è¯·æ±‚ï¼š", { bold: true }),
    body("1. ________________ï¼›", { indent: true }),
    body("2. ________________ï¼›", { indent: true }),
    body("3. æœ¬æ¡ˆè¯‰è®¼è´¹ã€PreservaciÃ³nè´¹etc.ç”±è¢«å‘Šæ‰¿æ‹…ã€‚", { indent: true }),
    blank(),
    body("äº‹å®žyç†ç”±ï¼š", { bold: true }),
    body("________________________________________________________________________", { indent: true }),
    body("________________________________________________________________________", { indent: true }),
    body("________________________________________________________________________", { indent: true }),
    blank(),
    body("ç»¼ä¸Šï¼Œæ ¹æ®ã€Šä¸­åŽäººæ°‘å…±å’Œå›½æ°‘æ³•å…¸ã€‹ã€Šä¸­åŽäººæ°‘å…±å’Œå›½æ°‘äº‹è¯‰è®¼æ³•ã€‹ä¹‹è§„å®šï¼Œè¯·æ±‚è´µé™¢ä¾æ³•åˆ¤å†³ï¼Œä»¥ç»´æŠ¤åŽŸå‘Šåˆæ³•æƒç›Šã€‚", { indent: true }),
    blank(),
    blank(),
    body("æ­¤è‡´"),
    body("{{proceeding.court}}", { bold: true }),
    blank(),
    blank(),
    body("èµ·è¯‰äºº(ç­¾å­—)ï¼š________________"),
    body("                                                            ä»£ç†Abogadoï¼š{{lawyer.name}}"),
    blank(),
    body("{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// æ¨¡æ¿ 8: æ°‘äº‹ç­”è¾©çŠ¶
// ============================================================
const T8_VARS = [
  "client.name",
  "client.idNumber",
  "client.address",
  "client.phone",
  "opposing.name",
  "opposing.address",
  "matter.causeText",
  "proceeding.court",
  "proceeding.caseNo",
  "lawyer.name",
  "todayCN"
];

async function buildT8(): Promise<Buffer> {
  return pack([
    title("æ°‘äº‹ç­”è¾©çŠ¶"),
    blank(),
    body("ç­”è¾©äººï¼š{{client.name}}"),
    body("èº«ä»½è¯å·ï¼š{{client.idNumber}}"),
    body("ä½å€ï¼š{{client.address}}"),
    body("è”ç³»ç”µè¯ï¼š{{client.phone}}"),
    blank(),
    body("è¢«ç­”è¾©äººï¼š{{opposing.name}}"),
    body("ä½å€ï¼š{{opposing.address}}"),
    blank(),
    body("Causaï¼š{{matter.causeText}}", { bold: true }),
    body("æ¡ˆå·ï¼š{{proceeding.caseNo}}", { bold: true }),
    blank(),
    body("é’ˆå¯¹è¢«ç­”è¾©äººçš„èµ·è¯‰ï¼Œç­”è¾©äººç­”è¾©å¦‚ä¸‹ï¼š", { indent: true, bold: true }),
    blank(),
    body("ä¸€ã€å…³äºŽè¯‰è®¼è¯·æ±‚", { bold: true }),
    body("________________________________________________________________________", { indent: true }),
    blank(),
    body("äºŒã€å…³äºŽäº‹å®žéƒ¨åˆ†", { bold: true }),
    body("________________________________________________________________________", { indent: true }),
    blank(),
    body("ä¸‰ã€å…³äºŽæ³•å¾‹é€‚ç”¨", { bold: true }),
    body("________________________________________________________________________", { indent: true }),
    blank(),
    body("ç»¼ä¸Šï¼Œè¯·æ±‚è´µé™¢ä¾æ³•Rechazarè¢«ç­”è¾©äººçš„è¯‰è®¼è¯·æ±‚ï¼Œä»¥ç»´æŠ¤ç­”è¾©äººåˆæ³•æƒç›Šã€‚", { indent: true }),
    blank(),
    blank(),
    body("æ­¤è‡´"),
    body("{{proceeding.court}}", { bold: true }),
    blank(),
    blank(),
    body("ç­”è¾©äºº(ç­¾å­—)ï¼š________________"),
    body("                                                            ä»£ç†Abogadoï¼š{{lawyer.name}}"),
    blank(),
    body("{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// æ¨¡æ¿ 9: å·å®—å°çš®ï¼ˆv0.9.4 å½’æ¡£ï¼‰
// ============================================================
const T9_VARS = [
  "firm.name",
  "matter.code",
  "matter.title",
  "matter.causeText",
  "matter.category",
  "client.name",
  "opposing.name",
  "lawyer.name",
  "archive.archiveNo",
  "archive.closedReasonCN",
  "archive.completedAtCN",
  "archive.archivedAtCN"
];

async function buildT9(): Promise<Buffer> {
  return pack([
    blank(),
    body("{{firm.name}}", { align: AlignmentType.CENTER, bold: true }),
    blank(),
    blank(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 240 },
      children: [
        new TextRun({ text: "å·    å®—", font: FONT_TITLE, size: 72, bold: true })
      ]
    }),
    blank(),
    blank(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 120 },
      children: [
        new TextRun({ text: "{{matter.title}}", font: FONT_TITLE, size: 36, bold: true })
      ]
    }),
    blank(),
    body("{{client.name}} è¯‰ {{opposing.name}}", { align: AlignmentType.CENTER }),
    blank(),
    blank(),
    blank(),
    kvTable([
      ["å½’æ¡£ç¼–å·", "{{archive.archiveNo}}"],
      ["Casoç¼–å·", "{{matter.code}}"],
      ["Casoç±»åˆ«", "{{matter.category}}"],
      ["Causa", "{{matter.causeText}}"],
      ["Cerrar casoæ–¹å¼", "{{archive.closedReasonCN}}"],
      ["Cerrar casoFecha", "{{archive.completedAtCN}}"],
      ["å½’æ¡£Fecha", "{{archive.archivedAtCN}}"],
      ["æ‰¿åŠžAbogado", "{{lawyer.name}}"]
    ]),
    blank(),
    blank(),
    body("æœ¬å·å®—è‡ªå½’æ¡£æ—¥èµ·æŒ‰å¾‹æ‰€è§„å®šGuardarï¼Œæœªç»è®¸å¯ä¸å¾—å€Ÿé˜…ã€å¤åˆ¶æˆ–è½¬äº¤ã€‚", { align: AlignmentType.CENTER })
  ]);
}

// ============================================================
// æ¨¡æ¿ 10: å·å®—ç›®å½•ï¼ˆv0.9.4 å½’æ¡£ï¼‰
// ============================================================
const T10_VARS = [
  "firm.name",
  "matter.code",
  "matter.title",
  "archive.archiveNo",
  "archive.archivedAtCN",
  "lawyer.name"
  // documents[] Aprobarè¿è¡Œæ—¶ injectï¼Œä¸åœ¨ detectMissing èŒƒå›´
];

function docCatalogHeaderRow(): TableRow {
  const headers = ["åºå·", "ææ–™Nombre", "ç±»åˆ«", "ä¸Šä¼ Fecha", "é¡µæ•°", "Observaciones"];
  return new TableRow({
    tableHeader: true,
    children: headers.map((h, idx) => new TableCell({
      width: { size: [8, 38, 14, 16, 10, 14][idx], type: WidthType.PERCENTAGE },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: h, font: FONT_BODY, size: 22, bold: true })]
        })
      ]
    }))
  });
}

function docCatalogLoopRow(): TableRow {
  // docxtemplater åœ¨è¡¨æ ¼å¾ªçŽ¯ï¼šå•pesosæ ¼å†…åˆ†åˆ«ç”¨ {{#documents}}...{{/documents}} åŒ…è£¹ä¼šå¤±æ•ˆï¼›
  // æ ‡å‡†åšæ³•æ˜¯æŠŠ loop æ ‡ç­¾æ”¾åœ¨æ•´è¡Œå¤–å±‚ï¼Œè¡Œ cell å†…åªæ”¾çº¯ {{var}}ã€‚è¿™é‡Œç”¨æ³¨é‡Šå ä½è¡Œ + æ–‡æ¡£ç”Ÿæˆæ—¶æ‰‹å·¥æ’å…¥å¾ªçŽ¯æ ‡ç­¾ã€‚
  // ä¸ºç®€åŒ–ï¼Œç›´æŽ¥ build ä¸€è¡Œ placeholdersï¼Œloop åŒ…è£¹Aprobar docxtemplater çš„ row loop è‡ªåŠ¨è¯†åˆ«ï¼ˆåŒä¸€è¡Œç¬¬ä¸€ä¸ª cell å« {{#documents}}ï¼‰ã€‚
  const cells: TableCell[] = [
    new TableCell({
      width: { size: 8, type: WidthType.PERCENTAGE },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "{{#documents}}{{seq}}", font: FONT_BODY, size: 22 })]
        })
      ]
    }),
    new TableCell({
      width: { size: 38, type: WidthType.PERCENTAGE },
      children: [
        new Paragraph({ children: [new TextRun({ text: "{{name}}", font: FONT_BODY, size: 22 })] })
      ]
    }),
    new TableCell({
      width: { size: 14, type: WidthType.PERCENTAGE },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "{{categoryCN}}", font: FONT_BODY, size: 22 })]
        })
      ]
    }),
    new TableCell({
      width: { size: 16, type: WidthType.PERCENTAGE },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "{{uploadDate}}", font: FONT_BODY, size: 22 })]
        })
      ]
    }),
    new TableCell({
      width: { size: 10, type: WidthType.PERCENTAGE },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "{{pages}}", font: FONT_BODY, size: 22 })]
        })
      ]
    }),
    new TableCell({
      width: { size: 14, type: WidthType.PERCENTAGE },
      children: [
        new Paragraph({ children: [new TextRun({ text: "{{remark}}{{/documents}}", font: FONT_BODY, size: 22 })] })
      ]
    })
  ];
  return new TableRow({ children: cells });
}

async function buildT10(): Promise<Buffer> {
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "555555" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "555555" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "555555" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "555555" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" }
    },
    rows: [docCatalogHeaderRow(), docCatalogLoopRow()]
  });

  return pack([
    body("{{firm.name}}", { align: AlignmentType.CENTER, bold: true }),
    title("å· å®— ç›® å½•"),
    body("å½’æ¡£ç¼–å·ï¼š{{archive.archiveNo}}    Casoç¼–å·ï¼š{{matter.code}}", { align: AlignmentType.RIGHT }),
    body("Casoï¼š{{matter.title}}", { align: AlignmentType.RIGHT }),
    blank(),
    table,
    blank(),
    body("æ‰¿åŠžAbogadoï¼š{{lawyer.name}}", { align: AlignmentType.RIGHT }),
    body("å½’æ¡£Fechaï¼š{{archive.archivedAtCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// Registrarseè¡¨
// ============================================================
export const BUILTIN_TEMPLATES: BuiltInTemplate[] = [
  {
    key: "civil_intake_registration",
    name: "æ°‘äº‹Casoæ”¶æ¡ˆç™»è®°è¡¨",
    category: "INTAKE",
    description: "æ°‘äº‹Casoæ”¶æ¡ˆä¿¡æ¯ç™»è®°ï¼Œç”¨äºŽå¾‹æ‰€æ”¶æ¡ˆç«‹å·ã€‚å­—æ®µè‡ªåŠ¨ä»ŽCasoä¿¡æ¯æŠ“å–ã€‚",
    applicableCategories: ["CIVIL_COMMERCIAL"],
    variables: T1_VARS,
    buildBuffer: buildT1
  },
  {
    key: "criminal_intake_registration",
    name: "PenalCasoæ”¶æ¡ˆç™»è®°è¡¨",
    category: "INTAKE",
    description: "PenalCasoæ”¶æ¡ˆä¿¡æ¯ç™»è®°ã€‚è¢«å‘Šäººç¾æŠ¼åœ°ç‚¹etc.å…³é”®å­—æ®µã€‚",
    applicableCategories: ["CRIMINAL"],
    variables: T2_VARS,
    buildBuffer: buildT2
  },
  {
    key: "legal_service_risk_notice",
    name: "æ³•å¾‹æœåŠ¡é£Žé™©å‘ŠçŸ¥ä¹¦",
    category: "INTAKE",
    description: "å‘å§”æ‰˜äººå‘ŠçŸ¥æ³•å¾‹æœåŠ¡çš„ä¸Aceptaræ€§yå„ç±»é£Žé™©ã€‚Abogadoyå§”æ‰˜äººç­¾å­—ã€‚",
    applicableCategories: [],
    variables: T3_VARS,
    buildBuffer: buildT3
  },
  {
    key: "retainer_individual",
    name: "å§”æ‰˜ä»£ç†åˆåŒ(ä¸ªäºº)",
    category: "RETAINER",
    description: "è‡ªç„¶äººå§”æ‰˜ä»£ç†åˆåŒæ ‡å‡†æ¨¡æ¿ï¼Œå«ä»£ç†æƒé™/Abogadoè´¹/äº‰è®®è§£å†³æ¡æ¬¾ã€‚",
    applicableCategories: [],
    variables: T4_VARS,
    buildBuffer: buildT4
  },
  {
    key: "retainer_organization",
    name: "å§”æ‰˜ä»£ç†åˆåŒ(å•ä½)",
    category: "RETAINER",
    description: "æ³•äººæˆ–éžæ³•äººç»„ç»‡å§”æ‰˜ä»£ç†åˆåŒæ ‡å‡†æ¨¡æ¿ã€‚",
    applicableCategories: [],
    variables: T5_VARS,
    buildBuffer: buildT5
  },
  {
    key: "power_of_attorney_individual",
    name: "æŽˆæƒå§”æ‰˜ä¹¦(ä¸ªäºº)",
    category: "RETAINER",
    description: "è‡ªç„¶äººæŽˆæƒå§”æ‰˜ä¹¦ï¼Œå«ä¸€èˆ¬ä»£ç† / ç‰¹åˆ«ä»£ç†å‹¾é€‰ã€‚",
    applicableCategories: [],
    variables: T6_VARS,
    buildBuffer: buildT6
  },
  {
    key: "civil_complaint",
    name: "æ°‘äº‹èµ·è¯‰çŠ¶",
    category: "LITIGATION",
    description: "æ°‘äº‹èµ·è¯‰çŠ¶æ ‡å‡†æ ¼å¼ã€‚è¯‰è®¼è¯·æ±‚yäº‹å®žç†ç”±éœ€Abogadoå¡«å……ã€‚",
    applicableCategories: ["CIVIL_COMMERCIAL"],
    variables: T7_VARS,
    buildBuffer: buildT7
  },
  {
    key: "civil_answer",
    name: "æ°‘äº‹ç­”è¾©çŠ¶",
    category: "LITIGATION",
    description: "æ°‘äº‹ç­”è¾©çŠ¶æ ‡å‡†æ ¼å¼ã€‚ç­”è¾©å†…å®¹éœ€Abogadoå¡«å……ã€‚",
    applicableCategories: ["CIVIL_COMMERCIAL"],
    variables: T8_VARS,
    buildBuffer: buildT8
  },
  {
    key: "archive_cover",
    name: "å·å®—å°çš®",
    category: "ARCHIVE",
    description: "å½’æ¡£æ—¶è‡ªåŠ¨ç”Ÿæˆã€‚å¾‹æ‰€æ ‡è¯† + Casoæ ‡é¢˜ + å½’æ¡£ç¼–å· + Cerrar casoä¿¡æ¯ã€‚Abogadoå‹¿æ‰‹åŠ¨æ¸²æŸ“ã€‚",
    applicableCategories: [],
    variables: T9_VARS,
    buildBuffer: buildT9
  },
  {
    key: "archive_catalog",
    name: "å·å®—ç›®å½•",
    category: "ARCHIVE",
    description: "å½’æ¡£æ—¶è‡ªåŠ¨ç”Ÿæˆã€‚åˆ—å‡ºæœ¬æ¡ˆVer todosææ–™ï¼ˆæŒ‰ä¸Šä¼ æ—¶é—´æŽ’åºï¼‰ã€‚Abogadoå‹¿æ‰‹åŠ¨æ¸²æŸ“ã€‚",
    applicableCategories: [],
    variables: T10_VARS,
    buildBuffer: buildT10
  }
];

