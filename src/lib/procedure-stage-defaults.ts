import type { ProcedureType } from "@prisma/client";

export type StagePresetKind = "required" | "optional";

export type ProcedureStagePreset = {
  name: string;
  kind: StagePresetKind;
  description: string;
};

const CIVIL_TRIAL_PRESETS: ProcedureStagePreset[] = [
  { name: "ä»£ç†æŽˆæƒ", kind: "required", description: "å§”æ‰˜æ‰‹ç»­ã€æŽˆæƒæ–‡ä»¶ã€å¾‹æ‰€å‡½ã€é£Žé™©å‘ŠçŸ¥å’Œææ–™äº¤æŽ¥ã€‚" },
  { name: "æ¡ˆæƒ…ç ”åˆ¤", kind: "required", description: "äº‹å®žæ¢³ç†ã€è¯æ®ç¼ºå£ã€æ³•å¾‹æ£€ç´¢å’Œè¯‰è®¼æ–¹æ¡ˆã€‚" },
  { name: "èµ·è¯‰ç«‹æ¡ˆ", kind: "required", description: "èµ·è¯‰/åº”è¯‰ææ–™ã€ä¸»ä½“èº«ä»½ã€ç®¡è¾–ææ–™ã€ç¼´è´¹å’Œè¯‰è°ƒè¡”æŽ¥ã€‚" },
  { name: "è´¢äº§PreservaciÃ³n", kind: "optional", description: "PreservaciÃ³nç”³è¯·ã€æ‹…ä¿ã€è£å®šã€ç»­ä¿å’Œè§£é™¤ã€‚" },
  { name: "ç®¡è¾–æƒå¼‚è®®", kind: "optional", description: "ç®¡è¾–å¼‚è®®ç”³è¯·æˆ–ç­”è¾©ã€è£å®šç­¾æ”¶å’Œä¸Šè¯‰è¡”æŽ¥ã€‚" },
  { name: "ä¸¾è¯è´¨è¯", kind: "required", description: "ä¸¾è¯Plazoã€è¯æ®äº¤æ¢ã€è¡¥å……è¯æ®å’Œè´¨è¯æ„è§ã€‚" },
  { name: "å¸æ³•é‰´å®š", kind: "optional", description: "é‰´å®šäº‹Ã­temsã€æ ·æœ¬ææ–™ã€é‰´å®šæœºæž„å’Œé‰´å®šæ„è§è´¨è¯ã€‚" },
  { name: "åº­å‰ä¼šè®®", kind: "optional", description: "åº­å‰ä¼šè®®Notificacionesã€äº‰ç‚¹Confirmarã€è¯æ®äº¤æ¢å’Œç¨‹åºå®‰æŽ’ã€‚" },
  { name: "æ¨¡æ‹Ÿæ³•åº­", kind: "optional", description: "äº‰ç‚¹æ¸…å•ã€å‘é—®æçº²ã€æ”»é˜²æ¼”ç»ƒå’ŒClienteåº­å‰æ²Ÿé€šã€‚" },
  { name: "å¼€åº­å®¡ç†", kind: "required", description: "ä¼ ç¥¨ã€åº­å®¡æçº²ã€å‘é—®æçº²ã€è¯æ®åŽŸä»¶å’Œåº­å®¡è®°å½•ã€‚" },
  { name: "åº­åŽè¡¥å……", kind: "optional", description: "åº­åŽä»£ç†æ„è§ã€è¡¥å……è¯æ®ã€åº­å®¡Informeå’Œæ³•å®˜æ²Ÿé€šã€‚" },
  { name: "è£åˆ¤ç­¾æ”¶", kind: "required", description: "è£åˆ¤æ–‡ä¹¦ç­¾æ”¶ã€ä¸Šè¯‰æœŸã€å±¥è¡ŒæœŸå’Œè£åˆ¤ç»“æžœInformeã€‚" },
  { name: "ä¸Šè¯‰/äºŒå®¡è¡”æŽ¥", kind: "optional", description: "æ˜¯å¦ä¸Šè¯‰ã€äºŒå®¡å§”æ‰˜ã€ä¸Šè¯‰ææ–™å’ŒäºŒå®¡ç­–ç•¥ã€‚" },
  { name: "Casoå½’æ¡£", kind: "required", description: "Cerrar casoInformeã€ææ–™å®Œæ•´æ€§ã€åŽŸä»¶é€€è¿˜å’Œå½’æ¡£ç”³è¯·ã€‚" }
];

const SECOND_INSTANCE_PRESETS: ProcedureStagePreset[] = [
  { name: "ä»£ç†æŽˆæƒ", kind: "required", description: "äºŒå®¡å§”æ‰˜æ‰‹ç»­ã€æŽˆæƒæ–‡ä»¶å’Œææ–™æŽ¥æ”¶ã€‚" },
  { name: "ä¸Šè¯‰/åº”è¯‰", kind: "required", description: "ä¸Šè¯‰çŠ¶ã€ç­”è¾©çŠ¶ã€äºŒå®¡è¯æ®å’Œä¸Šè¯‰è´¹ã€‚" },
  { name: "äºŒå®¡é˜…å·ç ”åˆ¤", kind: "required", description: "ä¸€å®¡å·å®—ã€è£åˆ¤äº‰ç‚¹ã€äºŒå®¡ä»£ç†æ€è·¯å’Œè¯æ®è¡¥å¼ºã€‚" },
  { name: "è´¢äº§PreservaciÃ³n", kind: "optional", description: "äºŒå®¡é˜¶æ®µPreservaciÃ³nã€ç»­ä¿æˆ–è§£é™¤è¡”æŽ¥ã€‚" },
  { name: "ç®¡è¾–æƒå¼‚è®®", kind: "optional", description: "äºŒå®¡ç¨‹åºä¸­çš„ç®¡è¾–æˆ–ç§»é€äº‰è®®å¤„ç†ã€‚" },
  { name: "ä¸¾è¯è´¨è¯", kind: "required", description: "äºŒå®¡æ–°è¯æ®ã€è¡¥å……è¯æ®å’Œè´¨è¯æ„è§ã€‚" },
  { name: "å¸æ³•é‰´å®š", kind: "optional", description: "äºŒå®¡é‰´å®šç”³è¯·ã€è¡¥å……é‰´å®šæˆ–é‰´å®šæ„è§è´¨è¯ã€‚" },
  { name: "æ¨¡æ‹Ÿæ³•åº­", kind: "optional", description: "äºŒå®¡äº‰ç‚¹æ”»é˜²ã€å‘é—®æçº²å’ŒClienteåº­å‰æ¼”ç»ƒã€‚" },
  { name: "å¼€åº­/è¯¢é—®", kind: "required", description: "å¼€åº­ã€è¯¢é—®æˆ–ä¹¦é¢å®¡ç†å‡†å¤‡yè®°å½•ã€‚" },
  { name: "åº­åŽè¡¥å……", kind: "optional", description: "åº­åŽè¡¥å……æ„è§ã€è¡¥äº¤ææ–™å’Œæ³•å®˜æ²Ÿé€šã€‚" },
  { name: "äºŒå®¡è£åˆ¤", kind: "required", description: "äºŒå®¡è£åˆ¤ç­¾æ”¶ã€ç”Ÿæ•ˆã€å±¥è¡Œå’ŒåŽç»­ç¨‹åºæç¤ºã€‚" },
  { name: "Casoå½’æ¡£", kind: "required", description: "äºŒå®¡Cerrar casoInformeã€ææ–™å½’æ¡£å’ŒåŽŸä»¶é€€è¿˜ã€‚" }
];

const ENFORCEMENT_PRESETS: ProcedureStagePreset[] = [
  { name: "ä»£ç†æŽˆæƒ", kind: "required", description: "æ‰§è¡Œé˜¶æ®µå§”æ‰˜æ‰‹ç»­å’Œææ–™äº¤æŽ¥ã€‚" },
  { name: "æ‰§è¡Œç«‹æ¡ˆ", kind: "required", description: "å¼ºåˆ¶æ‰§è¡Œç”³è¯·ã€ç”Ÿæ•ˆè¯æ˜Žã€è´¦æˆ·ä¿¡æ¯å’Œç«‹æ¡ˆææ–™ã€‚" },
  { name: "è´¢äº§PreservaciÃ³n", kind: "optional", description: "å·²PreservaciÃ³nè´¢äº§ç»­ä¿ã€è§£é™¤æˆ–åŽç»­å¤„ç½®ã€‚" },
  { name: "è´¢äº§æŸ¥æŽ§", kind: "required", description: "è´¢äº§çº¿ç´¢ã€ç½‘ç»œæŸ¥æŽ§ã€æŸ¥å°å†»ç»“å’Œå¤„ç½®è·Ÿè¿›ã€‚" },
  { name: "å¼‚è®®/å¤è®®", kind: "optional", description: "æ‰§è¡Œå¼‚è®®ã€å¤è®®ã€ä¸äºˆæ‰§è¡Œå’Œå¬è¯å‡†å¤‡ã€‚" },
  { name: "æ‰§è¡Œå’Œè§£", kind: "optional", description: "å’Œè§£æ–¹æ¡ˆã€åè®®ç­¾ç½²ã€å±¥è¡Œç›‘ç£å’Œæ¢å¤æ‰§è¡Œé¢„æ¡ˆã€‚" },
  { name: "æ‰§è¡ŒCerrar caso", kind: "required", description: "æ‰§è¡Œå›žæ¬¾ã€ç»ˆæœ¬/ç»ˆç»“ã€Cerrar casoæ–‡ä¹¦å’ŒåŽç»­å®‰æŽ’ã€‚" },
  { name: "Casoå½’æ¡£", kind: "required", description: "æ‰§è¡ŒCerrar casoInformeã€ææ–™å½’æ¡£å’ŒåŽŸä»¶é€€è¿˜ã€‚" }
];

const ARBITRATION_PRESETS: ProcedureStagePreset[] = [
  { name: "ä»£ç†æŽˆæƒ", kind: "required", description: "ä»²è£å§”æ‰˜æ‰‹ç»­ã€æŽˆæƒæ–‡ä»¶å’Œææ–™äº¤æŽ¥ã€‚" },
  { name: "æ¡ˆæƒ…ç ”åˆ¤", kind: "required", description: "äº‹å®žæ¢³ç†ã€è¯æ®ç¼ºå£ã€æ³•å¾‹æ£€ç´¢å’Œä»²è£æ–¹æ¡ˆã€‚" },
  { name: "ä»²è£ç«‹æ¡ˆ", kind: "required", description: "ä»²è£ç”³è¯·ã€ä¸»ä½“ææ–™ã€è¯æ®ç›®å½•å’Œä»²è£è´¹ç¼´çº³ã€‚" },
  { name: "è´¢äº§PreservaciÃ³n", kind: "optional", description: "ä»²è£PreservaciÃ³nã€æ‹…ä¿ã€æ³•é™¢ååŠ©æ‰§è¡Œå’Œç»­ä¿ã€‚" },
  { name: "ç®¡è¾–æƒå¼‚è®®", kind: "optional", description: "ä»²è£ç®¡è¾–å¼‚è®®ã€ä»²è£åè®®æ•ˆåŠ›å’Œç¨‹åºæŠ—è¾©ã€‚" },
  { name: "ä¸¾è¯è´¨è¯", kind: "required", description: "è¯æ®äº¤æ¢ã€è¡¥å……è¯æ®å’Œè´¨è¯æ„è§ã€‚" },
  { name: "å¸æ³•é‰´å®š", kind: "optional", description: "é‰´å®šç”³è¯·ã€æ ·æœ¬ææ–™ã€é‰´å®šæœºæž„å’Œé‰´å®šæ„è§è´¨è¯ã€‚" },
  { name: "æ¨¡æ‹Ÿæ³•åº­", kind: "optional", description: "ä»²è£åº­å®¡æ”»é˜²ã€å‘é—®æçº²å’ŒClienteåº­å‰æ¼”ç»ƒã€‚" },
  { name: "å¼€åº­å®¡ç†", kind: "required", description: "å¼€åº­Notificacionesã€åº­å®¡æçº²ã€å‘é—®æçº²å’ŒåŽŸä»¶æ ¸å¯¹ã€‚" },
  { name: "åº­åŽè¡¥å……", kind: "optional", description: "åº­åŽè¡¥å……æ„è§ã€è¡¥äº¤ææ–™å’Œä»²è£åº­æ²Ÿé€šã€‚" },
  { name: "ä»²è£è£å†³", kind: "required", description: "è£å†³ç­¾æ”¶ã€å±¥è¡Œã€æ’¤è£è¯„ä¼°å’ŒåŽç»­ç¨‹åºæç¤ºã€‚" },
  { name: "Casoå½’æ¡£", kind: "required", description: "ä»²è£Cerrar casoInformeã€ææ–™å½’æ¡£å’ŒåŽŸä»¶é€€è¿˜ã€‚" }
];

const CRIMINAL_INVESTIGATION_PRESETS: ProcedureStagePreset[] = [
  { name: "ä»£ç†æŽˆæƒ", kind: "required", description: "Penalå§”æ‰˜æ‰‹ç»­ã€æŽˆæƒææ–™å’Œä¼šè§æ‰‹ç»­ã€‚" },
  { name: "ä¼šè§", kind: "required", description: "ä¼šè§é¢„çº¦ã€ä¼šè§ç¬”å½•ã€å®¶å±žæ²Ÿé€šå’Œé£Žé™©æç¤ºã€‚" },
  { name: "å–ä¿å€™å®¡", kind: "optional", description: "å–ä¿è¯„ä¼°ã€ç”³è¯·ææ–™ã€ä¿è¯æ–¹å¼å’ŒåŠžæ¡ˆæœºå…³æ²Ÿé€šã€‚" },
  { name: "é˜…å·çº¿ç´¢", kind: "required", description: "äº‹å®žçº¿ç´¢ã€è¯æ®é£Žé™©ã€è¡¥å……ææ–™å’Œè°ƒæŸ¥æ–¹å‘ã€‚" },
  { name: "è¾©æŠ¤æ„è§", kind: "required", description: "ä¾¦æŸ¥é˜¶æ®µæ³•å¾‹æ„è§ã€ç¾æŠ¼å¿…è¦æ€§æ„è§å’Œæ²Ÿé€šç•™ç—•ã€‚" },
  { name: "Casoå½’æ¡£", kind: "required", description: "é˜¶æ®µæ€§Informeã€ææ–™å½’æ¡£å’ŒåŽç»­ç¨‹åºè¡”æŽ¥ã€‚" }
];

export function procedureStagePresetsForProcedure(type: ProcedureType): ProcedureStagePreset[] {
  if (type === "SECOND_INSTANCE" || type === "REMAND_SECOND") return SECOND_INSTANCE_PRESETS;
  if (type === "ENFORCEMENT" || type === "ENFORCEMENT_OBJECTION") return ENFORCEMENT_PRESETS;
  if (type === "COMMERCIAL_ARBITRATION" || type === "LABOR_ARBITRATION") return ARBITRATION_PRESETS;
  if (type === "INVESTIGATION") return CRIMINAL_INVESTIGATION_PRESETS;
  return CIVIL_TRIAL_PRESETS;
}

export function defaultStageNamesForProcedure(type: ProcedureType) {
  return procedureStagePresetsForProcedure(type)
    .filter((preset) => preset.kind === "required")
    .map((preset) => preset.name);
}

export function optionalStagePresetsForProcedure(type: ProcedureType) {
  return procedureStagePresetsForProcedure(type).filter((preset) => preset.kind === "optional");
}

export function normalizeProcedureStageName(name: string) {
  return name.trim().replace(/\s+/g, "");
}

export function stagePresetForName(type: ProcedureType, name: string) {
  const normalizedName = normalizeProcedureStageName(name);
  return procedureStagePresetsForProcedure(type).find(
    (preset) => normalizeProcedureStageName(preset.name) === normalizedName
  );
}

