/**
 * v1.0 P3ï¼šå†…ç½®æ¨¡æ¿æ‰©å®¹ï¼ˆç¬¬äºŒæ‰¹ 12 ä¸ªï¼ŒPRD Â§11.3 / Â§äºŒåä¸‰ï¼‰ã€‚
 *
 * y v0.8 é¦–æ‰¹åŒä¸€å¥— docx ç”Ÿæˆæ–¹å¼y {{var}} å ä½ç¬¦ä½“ç³»ï¼›
 * å˜é‡åä»¥ src/lib/template-engine.ts çš„æ¸²æŸ“ä¸Šä¸‹æ–‡ä¸ºå‡†
 * ï¼ˆfirm / matter / client / opposing / proceeding / lawyer / todayCNï¼‰ã€‚
 * å¾‹æ‰€éƒ¨ç½²åŽå¯åœ¨ /settings/templates ä¸Šä¼ è‡ªå®šä¹‰ç‰ˆæœ¬æ›¿æ¢ã€‚
 */
import { AlignmentType } from "docx";
import {
  title,
  body,
  blank,
  kvTable,
  pack,
  type BuiltInTemplate
} from "./template-builder";

// ============================================================
// T11 æŽˆæƒå§”æ‰˜ä¹¦ï¼ˆå•ä½ï¼‰
// ============================================================
const T11_VARS = [
  "client.name",
  "client.idNumber",
  "client.address",
  "firm.name",
  "lawyer.name",
  "opposing.name",
  "matter.causeText",
  "todayCN"
];

async function buildT11(): Promise<Buffer> {
  return pack([
    title("æŽˆæƒå§”æ‰˜ä¹¦"),
    blank(),
    body("å§”æ‰˜äººï¼š{{client.name}}"),
    body("ç»Ÿä¸€ç¤¾ä¼šä¿¡ç”¨ä»£ç ï¼š{{client.idNumber}}"),
    body("ä½æ‰€åœ°ï¼š{{client.address}}"),
    body("æ³•å®šä»£è¡¨äºº / è´Ÿè´£äººï¼š________________"),
    blank(),
    body("å—å§”æ‰˜äººï¼š{{lawyer.name}}ï¼Œ{{firm.name}}Abogadoã€‚"),
    blank(),
    body("çŽ°å§”æ‰˜ä¸Šåˆ—å—å§”æ‰˜äººåœ¨æœ¬å•ä½y {{opposing.name}} {{matter.causeText}} ä¸€æ¡ˆä¸­ï¼Œä½œä¸ºæœ¬å•ä½çš„è¯‰è®¼ï¼ˆä»²è£ï¼‰ä»£ç†äººã€‚", { indent: true }),
    blank(),
    body("ä»£ç†æƒé™ä¸º(è¯·å‹¾é€‰)ï¼š", { bold: true }),
    body("â˜ ä¸€èˆ¬ä»£ç†ã€‚"),
    body("â˜ ç‰¹åˆ«ä»£ç†ã€‚åŒ…æ‹¬ï¼šä»£ä¸ºæ‰¿è®¤ã€æ”¾å¼ƒã€å˜æ›´è¯‰è®¼è¯·æ±‚ï¼›ä»£ä¸ºæèµ·åè¯‰ã€ä¸Šè¯‰ï¼›ä»£ä¸ºç”³è¯·æ‰§è¡Œï¼›ä»£ä¸ºå’Œè§£ã€è°ƒè§£ï¼›ä»£ä¸ºç­¾æ”¶æ³•å¾‹æ–‡ä¹¦ã€‚"),
    blank(),
    body("å§”æ‰˜Plazoï¼šè‡ªç­¾ç½²ä¹‹æ—¥èµ·è‡³æœ¬æ¡ˆä»£ç†äº‹Ã­temsç»ˆç»“ã€‚"),
    blank(),
    blank(),
    body("å§”æ‰˜äºº(ç›–ç« )ï¼š________________"),
    body("æ³•å®šä»£è¡¨äºº(ç­¾å­—)ï¼š________________"),
    blank(),
    body("å—å§”æ‰˜äºº(ç­¾å­—)ï¼š{{lawyer.name}}"),
    blank(),
    body("{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// T12 æ°‘äº‹ä¸Šè¯‰çŠ¶
// ============================================================
const T12_VARS = [
  "client.name",
  "client.idNumber",
  "client.address",
  "opposing.name",
  "opposing.address",
  "matter.causeText",
  "proceeding.caseNo",
  "proceeding.court",
  "lawyer.name",
  "todayCN"
];

async function buildT12(): Promise<Buffer> {
  return pack([
    title("æ°‘äº‹ä¸Šè¯‰çŠ¶"),
    blank(),
    body("ä¸Šè¯‰äººï¼ˆåŽŸå®¡________ï¼‰ï¼š{{client.name}}"),
    body("èº«ä»½è¯å· / ç»Ÿä¸€ç¤¾ä¼šä¿¡ç”¨ä»£ç ï¼š{{client.idNumber}}"),
    body("ä½å€ï¼š{{client.address}}"),
    blank(),
    body("è¢«ä¸Šè¯‰äººï¼ˆåŽŸå®¡________ï¼‰ï¼š{{opposing.name}}"),
    body("ä½å€ï¼š{{opposing.address}}"),
    blank(),
    body("ä¸Šè¯‰äººå› yè¢«ä¸Šè¯‰äºº {{matter.causeText}} ä¸€æ¡ˆï¼Œä¸æœ {{proceeding.court}} ä½œå‡ºçš„ï¼ˆ________ï¼‰å·æ°‘äº‹åˆ¤å†³/è£å®šï¼ŒçŽ°æèµ·ä¸Šè¯‰ã€‚", { indent: true }),
    body("åŽŸå®¡æ¡ˆå·ï¼š{{proceeding.caseNo}}", { bold: true }),
    blank(),
    body("ä¸Šè¯‰è¯·æ±‚ï¼š", { bold: true }),
    body("1. ä¾æ³•æ’¤é”€åŽŸå®¡åˆ¤å†³ç¬¬____Ã­temsï¼Œæ”¹åˆ¤________________ï¼›", { indent: true }),
    body("2. æœ¬æ¡ˆä¸€ã€äºŒå®¡è¯‰è®¼Gastosç”±è¢«ä¸Šè¯‰äººæ‰¿æ‹…ã€‚", { indent: true }),
    blank(),
    body("ä¸Šè¯‰ç†ç”±ï¼š", { bold: true }),
    body("ä¸€ã€åŽŸå®¡åˆ¤å†³è®¤å®šäº‹å®žé”™è¯¯ã€‚________________________________________", { indent: true }),
    body("äºŒã€åŽŸå®¡åˆ¤å†³é€‚ç”¨æ³•å¾‹é”™è¯¯ã€‚________________________________________", { indent: true }),
    body("ä¸‰ã€________________________________________________________________", { indent: true }),
    blank(),
    body("ç»¼ä¸Šï¼Œè¯·æ±‚äºŒå®¡æ³•é™¢ä¾æ³•æ”¯æŒä¸Šè¯‰äººçš„ä¸Šè¯‰è¯·æ±‚ã€‚", { indent: true }),
    blank(),
    body("æ­¤è‡´"),
    body("________äººæ°‘æ³•é™¢", { bold: true }),
    blank(),
    blank(),
    body("ä¸Šè¯‰äºº(ç­¾å­—/ç›–ç« )ï¼š________________"),
    body("                                                            ä»£ç†Abogadoï¼š{{lawyer.name}}"),
    blank(),
    body("{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// T13 ä»²è£ç”³è¯·ä¹¦
// ============================================================
const T13_VARS = [
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

async function buildT13(): Promise<Buffer> {
  return pack([
    title("ä»²è£ç”³è¯·ä¹¦"),
    blank(),
    body("ç”³è¯·äººï¼š{{client.name}}"),
    body("èº«ä»½è¯å· / ç»Ÿä¸€ç¤¾ä¼šä¿¡ç”¨ä»£ç ï¼š{{client.idNumber}}"),
    body("ä½å€ï¼š{{client.address}}"),
    body("è”ç³»ç”µè¯ï¼š{{client.phone}}"),
    blank(),
    body("è¢«ç”³è¯·äººï¼š{{opposing.name}}"),
    body("èº«ä»½è¯å· / ç»Ÿä¸€ç¤¾ä¼šä¿¡ç”¨ä»£ç ï¼š{{opposing.idNumber}}"),
    body("ä½å€ï¼š{{opposing.address}}"),
    blank(),
    body("Causaï¼š{{matter.causeText}}", { bold: true }),
    body("äº‰è®®Montoï¼š{{matter.claimAmount}}", { bold: true }),
    body("ä»²è£ä¾æ®ï¼šåŒæ–¹äºŽ____å¹´__æœˆ__æ—¥ç­¾è®¢çš„ã€Š________________ã€‹ç¬¬____æ¡ä»²è£æ¡æ¬¾ã€‚", { indent: true }),
    blank(),
    body("ä»²è£è¯·æ±‚ï¼š", { bold: true }),
    body("1. ________________ï¼›", { indent: true }),
    body("2. ________________ï¼›", { indent: true }),
    body("3. æœ¬æ¡ˆä»²è£Gastosç”±è¢«ç”³è¯·äººæ‰¿æ‹…ã€‚", { indent: true }),
    blank(),
    body("äº‹å®žyç†ç”±ï¼š", { bold: true }),
    body("________________________________________________________________________", { indent: true }),
    body("________________________________________________________________________", { indent: true }),
    blank(),
    body("æ­¤è‡´"),
    body("{{proceeding.court}}", { bold: true }),
    blank(),
    blank(),
    body("ç”³è¯·äºº(ç­¾å­—/ç›–ç« )ï¼š________________"),
    body("                                                            ä»£ç†Abogadoï¼š{{lawyer.name}}"),
    blank(),
    body("{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// T14 è´¢äº§PreservaciÃ³nç”³è¯·ä¹¦
// ============================================================
const T14_VARS = [
  "client.name",
  "client.address",
  "opposing.name",
  "opposing.address",
  "matter.causeText",
  "matter.claimAmount",
  "proceeding.court",
  "proceeding.caseNo",
  "lawyer.name",
  "todayCN"
];

async function buildT14(): Promise<Buffer> {
  return pack([
    title("è´¢äº§PreservaciÃ³nç”³è¯·ä¹¦"),
    blank(),
    body("ç”³è¯·äººï¼š{{client.name}}"),
    body("ä½å€ï¼š{{client.address}}"),
    blank(),
    body("è¢«ç”³è¯·äººï¼š{{opposing.name}}"),
    body("ä½å€ï¼š{{opposing.address}}"),
    blank(),
    body("Causaï¼š{{matter.causeText}}    æ¡ˆå·ï¼š{{proceeding.caseNo}}", { bold: true }),
    blank(),
    body("è¯·æ±‚äº‹Ã­temsï¼š", { bold: true }),
    body("1. ä¾æ³•æŸ¥å°ã€å†»ç»“ã€æ‰£æŠ¼è¢«ç”³è¯·äººåä¸‹ä»·å€¼ {{matter.claimAmount}} çš„è´¢äº§ï¼›", { indent: true }),
    body("2. å…·ä½“è´¢äº§çº¿ç´¢ï¼šè¯¦è§Adjuntoã€Šè´¢äº§çº¿ç´¢æ¸…å•ã€‹ã€‚", { indent: true }),
    blank(),
    body("äº‹å®žyç†ç”±ï¼š", { bold: true }),
    body("ç”³è¯·äººyè¢«ç”³è¯·äºº {{matter.causeText}} ä¸€æ¡ˆï¼Œå› è¢«ç”³è¯·äººå­˜åœ¨è½¬ç§»ã€éšåŒ¿è´¢äº§çš„å¯èƒ½ï¼Œä¸é‡‡å–PreservaciÃ³næŽªæ–½å°†å¯¼è‡´ç”Ÿæ•ˆè£åˆ¤éš¾ä»¥æ‰§è¡Œã€‚æ ¹æ®ã€Šä¸­åŽäººæ°‘å…±å’Œå›½æ°‘äº‹è¯‰è®¼æ³•ã€‹ç¬¬ä¸€ç™¾ã€‡ä¸‰æ¡ã€ç¬¬ä¸€ç™¾ã€‡å››æ¡ä¹‹è§„å®šï¼Œç‰¹ç”³è¯·è´¢äº§PreservaciÃ³nã€‚", { indent: true }),
    blank(),
    body("æ‹…ä¿æ–¹å¼ï¼šâ˜ çŽ°é‡‘æ‹…ä¿  â˜ ä¿é™©å…¬å¸ä¿å‡½  â˜ è´¢äº§æ‹…ä¿ï¼ˆè¯¦è§æ‹…ä¿ææ–™ï¼‰", { indent: true }),
    blank(),
    body("æ­¤è‡´"),
    body("{{proceeding.court}}", { bold: true }),
    blank(),
    blank(),
    body("ç”³è¯·äºº(ç­¾å­—/ç›–ç« )ï¼š________________"),
    body("                                                            ä»£ç†Abogadoï¼š{{lawyer.name}}"),
    blank(),
    body("{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// T15 Abogadoå‡½
// ============================================================
const T15_VARS = [
  "firm.name",
  "firm.address",
  "firm.phone",
  "client.name",
  "opposing.name",
  "matter.causeText",
  "lawyer.name",
  "todayCN"
];

async function buildT15(): Promise<Buffer> {
  return pack([
    body("{{firm.name}}", { align: AlignmentType.CENTER, bold: true }),
    body("åœ°å€ï¼š{{firm.address}}    ç”µè¯ï¼š{{firm.phone}}", { align: AlignmentType.CENTER }),
    blank(),
    title("å¾‹ å¸ˆ å‡½"),
    body("ï¼ˆ____ï¼‰____å¾‹å‡½å­—ç¬¬____å·", { align: AlignmentType.RIGHT }),
    blank(),
    body("{{opposing.name}}ï¼š"),
    blank(),
    body("{{firm.name}}æŽ¥å— {{client.name}} çš„å§”æ‰˜ï¼ŒæŒ‡æ´¾æœ¬Abogadoå°± {{matter.causeText}} ç›¸å…³äº‹å®œè‡´å‡½è´µæ–¹ã€‚", { indent: true }),
    blank(),
    body("ä¸€ã€åŸºæœ¬äº‹å®ž", { bold: true }),
    body("________________________________________________________________________", { indent: true }),
    blank(),
    body("äºŒã€Abogadoæ„è§", { bold: true }),
    body("________________________________________________________________________", { indent: true }),
    blank(),
    body("ä¸‰ã€è¦æ±‚yPlazo", { bold: true }),
    body("è¯·è´µæ–¹äºŽæ”¶åˆ°æœ¬å‡½ä¹‹æ—¥èµ·____æ—¥å†…________________ï¼›Vencidoï¼Œæœ¬Abogadoå°†å»ºè®®å§”æ‰˜äººä¾æ³•é‡‡å–è¯‰è®¼ã€ä»²è£ã€PreservaciÃ³netc.æ³•å¾‹æŽªæ–½ï¼Œç”±æ­¤äº§ç”Ÿçš„ä¸€åˆ‡æ³•å¾‹åŽæžœç”±è´µæ–¹æ‰¿æ‹…ã€‚", { indent: true }),
    blank(),
    body("ç‰¹æ­¤å‡½å‘Šã€‚", { indent: true }),
    blank(),
    blank(),
    body("{{firm.name}}", { align: AlignmentType.RIGHT }),
    body("Abogadoï¼š{{lawyer.name}}", { align: AlignmentType.RIGHT }),
    body("{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// T16 æ³•å¾‹æ„è§ä¹¦
// ============================================================
const T16_VARS = [
  "firm.name",
  "client.name",
  "matter.title",
  "matter.causeText",
  "lawyer.name",
  "todayCN"
];

async function buildT16(): Promise<Buffer> {
  return pack([
    body("{{firm.name}}", { align: AlignmentType.CENTER, bold: true }),
    title("æ³•å¾‹æ„è§ä¹¦"),
    body("ï¼ˆ____ï¼‰____æ³•æ„å­—ç¬¬____å·", { align: AlignmentType.RIGHT }),
    blank(),
    body("è‡´ï¼š{{client.name}}"),
    blank(),
    body("{{firm.name}}æŽ¥å—è´µæ–¹å§”æ‰˜ï¼ŒæŒ‡æ´¾æœ¬Abogadoå°±ã€Œ{{matter.title}}ã€ç›¸å…³æ³•å¾‹äº‹Ã­temså‡ºå…·æœ¬æ³•å¾‹æ„è§ä¹¦ã€‚", { indent: true }),
    blank(),
    body("ä¸€ã€å§”æ‰˜äº‹Ã­temsyå®¡æŸ¥èŒƒå›´", { bold: true }),
    body("________________________________________________________________________", { indent: true }),
    blank(),
    body("äºŒã€åŸºæœ¬äº‹å®ž", { bold: true }),
    body("________________________________________________________________________", { indent: true }),
    blank(),
    body("ä¸‰ã€æ³•å¾‹åˆ†æž", { bold: true }),
    body("________________________________________________________________________", { indent: true }),
    body("________________________________________________________________________", { indent: true }),
    blank(),
    body("å››ã€ç»“è®ºæ„è§yé£Žé™©æç¤º", { bold: true }),
    body("________________________________________________________________________", { indent: true }),
    blank(),
    body("æœ¬æ„è§ä¹¦ä»…åŸºäºŽæˆªè‡³å‡ºå…·ä¹‹æ—¥å§”æ‰˜äººæä¾›çš„ææ–™ä½œå‡ºï¼Œä»…ä¾›å§”æ‰˜äººå°±æœ¬æ¬¡å§”æ‰˜äº‹Ã­temsä½¿ç”¨ã€‚", { indent: true }),
    blank(),
    blank(),
    body("{{firm.name}}", { align: AlignmentType.RIGHT }),
    body("ç»åŠžAbogadoï¼š{{lawyer.name}}", { align: AlignmentType.RIGHT }),
    body("{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// T17 ä»£ç†è¯
// ============================================================
const T17_VARS = [
  "client.name",
  "matter.causeText",
  "proceeding.caseNo",
  "proceeding.court",
  "firm.name",
  "lawyer.name",
  "todayCN"
];

async function buildT17(): Promise<Buffer> {
  return pack([
    title("ä»£ ç† è¯"),
    blank(),
    body("å®¡åˆ¤é•¿ã€å®¡åˆ¤å‘˜ï¼š"),
    blank(),
    body("{{firm.name}}æŽ¥å— {{client.name}} çš„å§”æ‰˜ï¼ŒæŒ‡æ´¾æœ¬Abogadoæ‹…ä»»å…¶yå¯¹æ–¹å½“äº‹äºº {{matter.causeText}} ä¸€æ¡ˆï¼ˆæ¡ˆå·ï¼š{{proceeding.caseNo}}ï¼‰çš„è¯‰è®¼ä»£ç†äººã€‚ç»åº­å‰é˜…å·ã€è°ƒæŸ¥å–è¯å¹¶å‚åŠ æ³•åº­å®¡ç†ï¼ŒçŽ°å‘è¡¨å¦‚ä¸‹ä»£ç†æ„è§ï¼š", { indent: true }),
    blank(),
    body("ä¸€ã€å…³äºŽæœ¬æ¡ˆäº‹å®ž", { bold: true }),
    body("________________________________________________________________________", { indent: true }),
    blank(),
    body("äºŒã€å…³äºŽè¯æ®yè´¨è¯æ„è§", { bold: true }),
    body("________________________________________________________________________", { indent: true }),
    blank(),
    body("ä¸‰ã€å…³äºŽæ³•å¾‹é€‚ç”¨", { bold: true }),
    body("________________________________________________________________________", { indent: true }),
    blank(),
    body("ç»¼ä¸Šæ‰€è¿°ï¼Œè¯·åˆè®®åº­é‡‡çº³ä»£ç†äººçš„æ„è§ï¼Œä¾æ³•æ”¯æŒå§”æ‰˜äººçš„ä¸»å¼ ã€‚", { indent: true }),
    blank(),
    body("æ­¤è‡´"),
    body("{{proceeding.court}}", { bold: true }),
    blank(),
    blank(),
    body("ä»£ç†Abogadoï¼š{{lawyer.name}}", { align: AlignmentType.RIGHT }),
    body("{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// T18 è°ˆè¯ç¬”å½•
// ============================================================
const T18_VARS = ["firm.name", "matter.code", "matter.title", "lawyer.name", "todayCN"];

async function buildT18(): Promise<Buffer> {
  return pack([
    body("{{firm.name}}", { align: AlignmentType.CENTER, bold: true }),
    title("è°ˆ è¯ ç¬” å½•"),
    blank(),
    kvTable([
      ["Caso", "{{matter.title}}ï¼ˆ{{matter.code}}ï¼‰"],
      ["æ—¶é—´", "____å¹´__æœˆ__æ—¥ __æ—¶__åˆ† è‡³ __æ—¶__åˆ†"],
      ["åœ°ç‚¹", ""],
      ["è°ˆè¯äºº", "{{lawyer.name}}"],
      ["è®°å½•äºº", ""],
      ["è¢«è°ˆè¯äºº", ""],
      ["èº«ä»½/è”ç³»æ–¹å¼", ""]
    ]),
    blank(),
    body("è°ˆè¯å†…å®¹ï¼š", { bold: true }),
    body("é—®ï¼š________________________________________________________________"),
    body("ç­”ï¼š________________________________________________________________"),
    blank(),
    body("é—®ï¼š________________________________________________________________"),
    body("ç­”ï¼š________________________________________________________________"),
    blank(),
    body("é—®ï¼š________________________________________________________________"),
    body("ç­”ï¼š________________________________________________________________"),
    blank(),
    blank(),
    body("ä»¥ä¸Šç¬”å½•ç»è¢«è°ˆè¯äººæ ¸å¯¹æ— è¯¯ã€‚"),
    blank(),
    body("è¢«è°ˆè¯äºº(ç­¾å­—æŒ‰å°)ï¼š________________    è°ˆè¯äºº(ç­¾å­—)ï¼š________________"),
    blank(),
    body("{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// T19 ä¼šè§ç¬”å½•ï¼ˆPenalï¼‰
// ============================================================
const T19_VARS = ["firm.name", "matter.code", "matter.title", "client.name", "lawyer.name", "todayCN"];

async function buildT19(): Promise<Buffer> {
  return pack([
    body("{{firm.name}}", { align: AlignmentType.CENTER, bold: true }),
    title("ä¼š è§ ç¬” å½•"),
    blank(),
    kvTable([
      ["Caso", "{{matter.title}}ï¼ˆ{{matter.code}}ï¼‰"],
      ["ä¼šè§æ—¶é—´", "____å¹´__æœˆ__æ—¥ __æ—¶__åˆ† è‡³ __æ—¶__åˆ†"],
      ["ä¼šè§åœ°ç‚¹", "________çœ‹å®ˆæ‰€ / ç›‘ç‹±"],
      ["ä¼šè§Abogado", "{{lawyer.name}}"],
      ["è¢«ä¼šè§äºº", "{{client.name}}"],
      ["æ¶‰å«Œç½ªå / è¯‰è®¼é˜¶æ®µ", ""],
      ["ç¾æŠ¼Plazoæƒ…å†µ", ""]
    ]),
    blank(),
    body("ä¼šè§å†…å®¹ï¼š", { bold: true }),
    body("ä¸€ã€å‘ŠçŸ¥äº‹Ã­temsï¼ˆAbogadoèº«ä»½ã€å§”æ‰˜æ‰‹ç»­ã€æƒåˆ©ä¹‰åŠ¡ï¼‰ï¼š", { bold: true }),
    body("________________________________________________________________________"),
    blank(),
    body("äºŒã€Casoäº‹å®žäº†è§£ï¼š", { bold: true }),
    body("________________________________________________________________________"),
    body("________________________________________________________________________"),
    blank(),
    body("ä¸‰ã€ç¨‹åºæ€§äº‹Ã­temsï¼ˆå¼ºåˆ¶æŽªæ–½ã€è®¯é—®æƒ…å†µã€èº«ä½“çŠ¶å†µã€å®¶å±žè½¬è¾¾ï¼‰ï¼š", { bold: true }),
    body("________________________________________________________________________"),
    blank(),
    body("å››ã€Siguienteè¾©æŠ¤å®‰æŽ’ï¼š", { bold: true }),
    body("________________________________________________________________________"),
    blank(),
    body("ä»¥ä¸Šç¬”å½•ç»è¢«ä¼šè§äººæ ¸å¯¹æ— è¯¯ã€‚"),
    blank(),
    body("è¢«ä¼šè§äºº(ç­¾å­—æŒ‰å°)ï¼š________________    ä¼šè§Abogado(ç­¾å­—)ï¼š{{lawyer.name}}"),
    blank(),
    body("{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// T20 Cerrar casoç™»è®°è¡¨
// ============================================================
const T20_VARS = [
  "firm.name",
  "matter.code",
  "matter.title",
  "matter.category",
  "matter.causeText",
  "matter.claimAmount",
  "client.name",
  "opposing.name",
  "proceeding.court",
  "proceeding.caseNo",
  "lawyer.name",
  "todayCN"
];

async function buildT20(): Promise<Buffer> {
  return pack([
    body("{{firm.name}}", { align: AlignmentType.CENTER, bold: true }),
    title("Cerrar casoç™»è®°è¡¨"),
    blank(),
    kvTable([
      ["Casoç¼–å·", "{{matter.code}}"],
      ["CasoNombre", "{{matter.title}}"],
      ["Casoç±»åˆ«", "{{matter.category}}"],
      ["Causa", "{{matter.causeText}}"],
      ["å§”æ‰˜äºº", "{{client.name}}"],
      ["å¯¹æ–¹å½“äº‹äºº", "{{opposing.name}}"],
      ["åŠžç†æœºå…³", "{{proceeding.court}}"],
      ["æ¡ˆå·", "{{proceeding.caseNo}}"],
      ["æ ‡çš„Monto", "{{matter.claimAmount}}"],
      ["æ‰¿åŠžAbogado", "{{lawyer.name}}"],
      ["Cerrar casoFecha", "{{todayCN}}"]
    ]),
    blank(),
    body("Cerrar casoæ–¹å¼ï¼šâ˜ åˆ¤å†³  â˜ è°ƒè§£  â˜ ä»²è£è£å†³  â˜ å’Œè§£æ’¤è¯‰  â˜ æ‰§è¡Œå®Œæ¯•  â˜ å…¶ä»–________", { bold: true }),
    blank(),
    body("åŠžç†ç»“æžœæ‘˜è¦ï¼š", { bold: true }),
    body("________________________________________________________________________"),
    body("________________________________________________________________________"),
    blank(),
    body("Abogadoè´¹æ”¶å–æƒ…å†µï¼šâ˜ å·²ç»“æ¸…  â˜ æœªç»“æ¸…ï¼ˆä½™é¢________pesosï¼‰"),
    body("åŽŸä»¶ææ–™é€€è¿˜æƒ…å†µï¼šâ˜ å·²é€€è¿˜å¹¶ç­¾æ”¶  â˜ æ— éœ€é€€è¿˜"),
    blank(),
    body("æ‰¿åŠžAbogado(ç­¾å­—)ï¼š________________    ä¸»ä»»å®¡æ ¸(ç­¾å­—)ï¼š________________"),
    blank(),
    body("{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// T21 è¯æ®ç›®å½•
// ============================================================
const T21_VARS = [
  "client.name",
  "matter.causeText",
  "proceeding.court",
  "proceeding.caseNo",
  "lawyer.name",
  "todayCN"
];

async function buildT21(): Promise<Buffer> {
  return pack([
    title("è¯ æ® ç›® å½•"),
    blank(),
    body("Enviaräººï¼š{{client.name}}    Causaï¼š{{matter.causeText}}"),
    body("å—ç†æœºå…³ï¼š{{proceeding.court}}    æ¡ˆå·ï¼š{{proceeding.caseNo}}"),
    blank(),
    kvTable([
      ["åºå· / è¯æ®Nombre", "è¯æ˜Žç›®çš„ / æ¥æº / é¡µæ•°"],
      ["è¯æ®ä¸€ï¼š", ""],
      ["è¯æ®äºŒï¼š", ""],
      ["è¯æ®ä¸‰ï¼š", ""],
      ["è¯æ®å››ï¼š", ""],
      ["è¯æ®äº”ï¼š", ""],
      ["è¯æ®å…­ï¼š", ""]
    ]),
    blank(),
    body("ä»¥ä¸Šè¯æ®å‡Enviarå¤å°ä»¶ï¼ŒåŽŸä»¶å½“åº­æ ¸å¯¹ã€‚", { indent: true }),
    blank(),
    body("Enviaräºº(ç­¾å­—/ç›–ç« )ï¼š________________    ä»£ç†Abogadoï¼š{{lawyer.name}}"),
    blank(),
    body("{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// T22 ç©ºç™½æ–‡æ¡£ï¼ˆå¾‹æ‰€æŠ¬å¤´ï¼‰
// ============================================================
const T22_VARS = ["firm.name", "firm.address", "firm.phone", "lawyer.name", "todayCN"];

async function buildT22(): Promise<Buffer> {
  return pack([
    body("{{firm.name}}", { align: AlignmentType.CENTER, bold: true }),
    body("åœ°å€ï¼š{{firm.address}}    ç”µè¯ï¼š{{firm.phone}}", { align: AlignmentType.CENTER }),
    blank(),
    blank(),
    body(""),
    body(""),
    body(""),
    body(""),
    body(""),
    body(""),
    body(""),
    body(""),
    blank(),
    blank(),
    body("ç»åŠžAbogadoï¼š{{lawyer.name}}", { align: AlignmentType.RIGHT }),
    body("{{todayCN}}", { align: AlignmentType.RIGHT })
  ]);
}

// ============================================================
// Registrarseè¡¨ï¼ˆç¬¬äºŒæ‰¹ï¼‰
// ============================================================
export const V1_TEMPLATES: BuiltInTemplate[] = [
  {
    key: "power_of_attorney_organization",
    name: "æŽˆæƒå§”æ‰˜ä¹¦(å•ä½)",
    category: "RETAINER",
    description: "æ³•äººæˆ–éžæ³•äººç»„ç»‡æŽˆæƒå§”æ‰˜ä¹¦ï¼Œå«ä¸€èˆ¬ä»£ç† / ç‰¹åˆ«ä»£ç†å‹¾é€‰ã€‚",
    applicableCategories: [],
    variables: T11_VARS,
    buildBuffer: buildT11
  },
  {
    key: "civil_appeal",
    name: "æ°‘äº‹ä¸Šè¯‰çŠ¶",
    category: "LITIGATION",
    description: "ä¸æœä¸€å®¡åˆ¤å†³/è£å®šçš„ä¸Šè¯‰çŠ¶æ ‡å‡†æ ¼å¼ã€‚ä¸Šè¯‰è¯·æ±‚yç†ç”±éœ€Abogadoå¡«å……ã€‚",
    applicableCategories: ["CIVIL_COMMERCIAL"],
    variables: T12_VARS,
    buildBuffer: buildT12
  },
  {
    key: "arbitration_application",
    name: "ä»²è£ç”³è¯·ä¹¦",
    category: "LITIGATION",
    description: "å•†äº‹/åŠ³åŠ¨ä»²è£ç”³è¯·ä¹¦æ ‡å‡†æ ¼å¼ï¼Œå«ä»²è£æ¡æ¬¾æ´å¼•ã€‚",
    applicableCategories: ["CIVIL_COMMERCIAL", "COMMERCIAL_ARBITRATION", "LABOR_ARBITRATION"],
    variables: T13_VARS,
    buildBuffer: buildT13
  },
  {
    key: "property_preservation_application",
    name: "è´¢äº§PreservaciÃ³nç”³è¯·ä¹¦",
    category: "LITIGATION",
    description: "è¯‰å‰/è¯‰ä¸­è´¢äº§PreservaciÃ³nç”³è¯·ï¼Œå«æ‹…ä¿æ–¹å¼å‹¾é€‰ï¼ˆä¾æ®æ°‘è¯‰æ³• 103/104 æ¡ï¼‰ã€‚",
    applicableCategories: ["CIVIL_COMMERCIAL", "COMMERCIAL_ARBITRATION"],
    variables: T14_VARS,
    buildBuffer: buildT14
  },
  {
    key: "lawyer_letter",
    name: "Abogadoå‡½",
    category: "WORK_PRODUCT",
    description: "å¯¹å¤–å‚¬å‘Š/å‘ŠçŸ¥å‡½ï¼Œå¥—å¾‹æ‰€æŠ¬å¤´ï¼Œå«è¦æ±‚yPlazoæ®µè½ã€‚",
    applicableCategories: [],
    variables: T15_VARS,
    buildBuffer: buildT15
  },
  {
    key: "legal_opinion",
    name: "æ³•å¾‹æ„è§ä¹¦",
    category: "WORK_PRODUCT",
    description: "å››æ®µå¼æ³•å¾‹æ„è§ä¹¦ï¼ˆå§”æ‰˜äº‹Ã­tems/äº‹å®ž/åˆ†æž/ç»“è®ºyé£Žé™©æç¤ºï¼‰ã€‚",
    applicableCategories: [],
    variables: T16_VARS,
    buildBuffer: buildT16
  },
  {
    key: "agency_opinion",
    name: "ä»£ç†è¯",
    category: "WORK_PRODUCT",
    description: "åº­å®¡ä»£ç†è¯æ ‡å‡†ç»“æž„ï¼ˆäº‹å®ž/è¯æ®/æ³•å¾‹é€‚ç”¨ä¸‰æ®µï¼‰ã€‚",
    applicableCategories: ["CIVIL_COMMERCIAL", "COMMERCIAL_ARBITRATION", "LABOR_ARBITRATION", "ADMINISTRATIVE"],
    variables: T17_VARS,
    buildBuffer: buildT17
  },
  {
    key: "meeting_notes",
    name: "è°ˆè¯ç¬”å½•",
    category: "HEARING",
    description: "yå½“äº‹äºº/è¯äººè°ˆè¯çš„é—®ç­”å¼ç¬”å½•ï¼Œå«ç­¾å­—Confirmarã€‚",
    applicableCategories: [],
    variables: T18_VARS,
    buildBuffer: buildT18
  },
  {
    key: "detention_meeting_notes",
    name: "ä¼šè§ç¬”å½•(Penal)",
    category: "HEARING",
    description: "çœ‹å®ˆæ‰€ä¼šè§ç¬”å½•ï¼šå‘ŠçŸ¥äº‹Ã­tems/Casoäº‹å®ž/ç¨‹åºäº‹Ã­tems/è¾©æŠ¤å®‰æŽ’å››æ®µã€‚",
    applicableCategories: ["CRIMINAL"],
    variables: T19_VARS,
    buildBuffer: buildT19
  },
  {
    key: "case_closing_registration",
    name: "Cerrar casoç™»è®°è¡¨",
    category: "CLOSING",
    description: "Cerrar casoä¿¡æ¯ç™»è®°ï¼šCerrar casoæ–¹å¼/ç»“æžœæ‘˜è¦/GastosyåŽŸä»¶é€€è¿˜Confirmarã€‚",
    applicableCategories: [],
    variables: T20_VARS,
    buildBuffer: buildT20
  },
  {
    key: "evidence_catalog",
    name: "è¯æ®ç›®å½•",
    category: "ARCHIVE",
    description: "éšè¯æ®ææ–™Enviaræ³•é™¢/ä»²è£æœºæž„çš„è¯æ®æ¸…å•ï¼ˆNombre/è¯æ˜Žç›®çš„/é¡µæ•°ï¼‰ã€‚",
    applicableCategories: ["CIVIL_COMMERCIAL", "COMMERCIAL_ARBITRATION", "LABOR_ARBITRATION", "ADMINISTRATIVE"],
    variables: T21_VARS,
    buildBuffer: buildT21
  },
  {
    key: "blank_letterhead",
    name: "ç©ºç™½æ–‡æ¡£(å¾‹æ‰€æŠ¬å¤´)",
    category: "BLANK",
    description: "å¥—å¾‹æ‰€æŠ¬å¤´çš„ç©ºç™½æ–‡æ¡£ï¼Œè‡ªç”±æ’°å†™ä»»ä½•æ–‡ä¹¦ã€‚",
    applicableCategories: [],
    variables: T22_VARS,
    buildBuffer: buildT22
  }
];

