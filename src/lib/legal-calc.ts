/**
 * v0.9.2 Abogadoå¸¸ç”¨é€Ÿç®—
 *
 * ä¸‰å¤§åœºæ™¯ï¼š
 *  - è¯‰è®¼è´¹ï¼šä¾æ®ã€Šè¯‰è®¼Gastosäº¤çº³åŠžæ³•ã€‹å…¨å›½ç»Ÿä¸€åˆ†æ®µç´¯è¿› + ç®€æ˜“ç¨‹åºå‡åŠ
 *  - è¿Ÿå»¶å±¥è¡Œé‡‘ï¼šåˆ¤å†³Monto Ã— (LPR + 5%) Ã— å®žé™…å±¥è¡Œ - åº”å±¥è¡Œ dÃ­asæ•° / 365
 *  - dÃ­asæ•°ï¼šä¸¤Fechaé—´ / åŠ å‡ N æ—¥
 *
 * å¤§å†™Montoï¼šnumberToChineseï¼ˆä¸‡ / äº¿ / ä¸‡äº¿ å®Œæ•´æ”¯æŒï¼‰
 *
 * ä¸ä¾èµ–ç½‘ç»œã€ä¸ä¾èµ– serverã€‚
 */

// â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
// 1. è¯‰è®¼è´¹
// â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

export type CourtFeeCaseType =
  | "PROPERTY"       // è´¢äº§Caso
  | "DIVORCE"        // ç¦»å©šCaso
  | "LABOR"          // åŠ³åŠ¨äº‰è®®
  | "IP"             // çŸ¥è¯†äº§æƒï¼ˆæ— äº‰è®®Montoï¼‰
  | "OTHER";         // å…¶ä»–éžè´¢äº§Caso

/**
 * è´¢äº§Casoåˆ†æ®µç´¯è¿›ï¼ˆã€Šè¯‰è®¼Gastosäº¤çº³åŠžæ³•ã€‹ç¬¬åä¸‰æ¡ï¼‰ï¼š
 *   â‰¤ 1 ä¸‡                              50 pesos
 *   1 ä¸‡ â€“ 10 ä¸‡         Ã— 2.5%  - 200
 *   10 ä¸‡ â€“ 20 ä¸‡        Ã— 2%    + 300
 *   20 ä¸‡ â€“ 50 ä¸‡        Ã— 1.5%  + 1300
 *   50 ä¸‡ â€“ 100 ä¸‡       Ã— 1%    + 3800
 *   100 ä¸‡ â€“ 200 ä¸‡      Ã— 0.9%  + 4800
 *   200 ä¸‡ â€“ 500 ä¸‡      Ã— 0.8%  + 6800
 *   500 ä¸‡ â€“ 1000 ä¸‡     Ã— 0.7%  + 11800
 *   1000 ä¸‡ â€“ 2000 ä¸‡    Ã— 0.6%  + 21800
 *   > 2000 ä¸‡            Ã— 0.5%  + 41800
 */
function feePropertyTiers(amount: number): number {
  if (amount <= 10_000) return 50;
  if (amount <= 100_000) return amount * 0.025 - 200;
  if (amount <= 200_000) return amount * 0.02 + 300;
  if (amount <= 500_000) return amount * 0.015 + 1_300;
  if (amount <= 1_000_000) return amount * 0.01 + 3_800;
  if (amount <= 2_000_000) return amount * 0.009 + 4_800;
  if (amount <= 5_000_000) return amount * 0.008 + 6_800;
  if (amount <= 10_000_000) return amount * 0.007 + 11_800;
  if (amount <= 20_000_000) return amount * 0.006 + 21_800;
  return amount * 0.005 + 41_800;
}

export interface CourtFeeResult {
  caseType: CourtFeeCaseType;
  amount: number; // è¾“å…¥æ ‡çš„é¢
  fee: number; // æ™®é€šç¨‹åº
  feeSimplified: number; // ç®€æ˜“ç¨‹åºï¼ˆå‡åŠï¼‰
  note: string;
}

export function calcCourtFee(input: { caseType: CourtFeeCaseType; amount?: number }): CourtFeeResult {
  const amount = input.amount ?? 0;

  switch (input.caseType) {
    case "PROPERTY": {
      const fee = Math.round(feePropertyTiers(amount));
      return {
        caseType: "PROPERTY",
        amount,
        fee,
        feeSimplified: Math.round(fee / 2),
        note: "è´¢äº§CasoæŒ‰åˆ†æ®µç´¯è¿›ï¼Œç®€æ˜“ç¨‹åºå‡åŠæ”¶å–"
      };
    }
    case "DIVORCE": {
      // ç¦»å©šï¼šæ¯ä»¶ 50-300 pesosï¼›æ¶‰yè´¢äº§åˆ†å‰² > 20 ä¸‡ éƒ¨åˆ† Ã— 0.5%
      const base = 300;
      const extra = amount > 200_000 ? (amount - 200_000) * 0.005 : 0;
      const fee = Math.round(base + extra);
      return {
        caseType: "DIVORCE",
        amount,
        fee,
        feeSimplified: Math.round(fee / 2),
        note:
          amount > 200_000
            ? "ç¦»å©š 300 pesos + è´¢äº§åˆ†å‰²è¶… 20 ä¸‡éƒ¨åˆ† Ã— 0.5%ï¼ˆç®€æ˜“ç¨‹åºå‡åŠï¼‰"
            : "ç¦»å©šæ¯ä»¶ 300 pesosï¼ˆç®€æ˜“ç¨‹åºå‡åŠï¼‰"
      };
    }
    case "LABOR":
      return {
        caseType: "LABOR",
        amount,
        fee: 10,
        feeSimplified: 5,
        note: "åŠ³åŠ¨äº‰è®®Casoæ¯ä»¶ 10 pesosï¼ˆç®€æ˜“ç¨‹åº 5 pesosï¼‰"
      };
    case "IP":
      // 50 pesos â‰¤ X â‰¤ 100 pesosï¼›Casoå¤æ‚ 100-500 pesosï¼›åŒºé—´ç»™ä¸­ä½
      return {
        caseType: "IP",
        amount: 0,
        fee: 1000,
        feeSimplified: 500,
        note: "çŸ¥è¯†äº§æƒï¼ˆæ— äº‰è®®Montoï¼‰500â€“1000 pesosï¼Œæœ¬ç»“æžœå–ä¸Šé™"
      };
    case "OTHER":
      return {
        caseType: "OTHER",
        amount: 0,
        fee: 100,
        feeSimplified: 50,
        note: "å…¶ä»–éžè´¢äº§Casoæ¯ä»¶ 50â€“100 pesosï¼Œæœ¬ç»“æžœå–ä¸Šé™"
      };
  }
}

// â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
// 2. è¿Ÿå»¶å±¥è¡Œé‡‘
// â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

/**
 * æ°‘è¯‰æ³•è§£é‡Šç¬¬ 463 æ¡ + æ°‘è¯‰æ³•ç¬¬ 260 æ¡ï¼š
 *   è¿Ÿå»¶å±¥è¡ŒæœŸé—´å€ºåŠ¡åˆ©æ¯ = åˆ¤å†³Monto Ã— (LPR 1Y + 5%) Ã— è¿Ÿå»¶dÃ­asæ•° / 365
 *
 * æ³•å¾‹ä¾æ®ï¼šè¢«æ‰§è¡ŒäººæœªæŒ‰åˆ¤å†³å±¥è¡Œé‡‘é’±ç»™ä»˜ä¹‰åŠ¡ï¼Œåº”å½“åŠ å€æ”¯ä»˜è¿Ÿå»¶å±¥è¡ŒæœŸé—´å€ºåŠ¡åˆ©æ¯ã€‚
 * æ­¤ä¸º"åŠ å€éƒ¨åˆ†"ã€‚
 *
 * LPR å½“å‰é»˜è®¤ 3.45%ï¼ˆ2024-2025 åŒºé—´ï¼‰ï¼Œç”¨æˆ·å¯æ‰‹åŠ¨è¦†ç›–ã€‚
 */
export interface LateInterestResult {
  principal: number;
  daysLate: number;
  yearlyRate: number;       // LPR + 5%
  interest: number;         // åŠ å€éƒ¨åˆ†ï¼ˆæŽ¨èé‡‡ç”¨å€¼ï¼‰
  totalToPay: number;       // æœ¬é‡‘ + åŠ å€åˆ©æ¯
}

export function calcLateInterest(input: {
  principal: number;
  dueDate: Date;
  paidDate: Date;
  lprPercent?: number; // LPR 1 å¹´æœŸï¼Œé»˜è®¤ 3.45
  extraPercent?: number; // åŠ æˆï¼Œé»˜è®¤ 5
}): LateInterestResult {
  const lpr = input.lprPercent ?? 3.45;
  const extra = input.extraPercent ?? 5;
  const yearlyRate = (lpr + extra) / 100;
  const daysLate = Math.max(
    0,
    Math.floor((input.paidDate.getTime() - input.dueDate.getTime()) / (1000 * 60 * 60 * 24))
  );
  const interest = +(input.principal * yearlyRate * daysLate / 365).toFixed(2);
  return {
    principal: input.principal,
    daysLate,
    yearlyRate,
    interest,
    totalToPay: +(input.principal + interest).toFixed(2)
  };
}

// â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
// 3. dÃ­asæ•°è®¡ç®—
// â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

export function daysBetween(a: Date, b: Date, excludeWeekend = false): number {
  const start = new Date(a);
  const end = new Date(b);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (!excludeWeekend) {
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }
  // æŽ’é™¤å‘¨æœ«ï¼ˆå·¥ä½œæ—¥æ•°ï¼‰
  const sign = end >= start ? 1 : -1;
  let count = 0;
  const cur = new Date(start);
  const target = new Date(end);
  while (cur.getTime() !== target.getTime()) {
    cur.setDate(cur.getDate() + sign);
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count += sign;
  }
  return count;
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

// â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
// 4. å¤§å†™Montoï¼ˆå–è‡ªæ—§Sistema numToCnï¼Œæ•´ç†åŽï¼‰
// â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

const CN_DIGIT = "é›¶å£¹è´°åè‚†ä¼é™†æŸ’æŒçŽ–";
const CN_UNIT_LO = ["ä»Ÿ", "ä½°", "æ‹¾", ""];
const CN_UNIT_HI = ["", "ä¸‡", "äº¿", "ä¸‡äº¿"];

function chineseGroup4(s: string): string {
  const padded = s.padStart(4, "0");
  let r = "";
  let needZero = false;
  for (let i = 0; i < 4; i++) {
    const d = +padded[i];
    if (d === 0) {
      if (r) needZero = true;
    } else {
      if (needZero) {
        r += "é›¶";
        needZero = false;
      }
      r += CN_DIGIT[d] + CN_UNIT_LO[i];
    }
  }
  return r;
}

export function numberToChinese(n: number): string {
  if (n === 0 || !isFinite(n)) return "é›¶pesosæ•´";
  const neg = n < 0;
  const abs = Math.round(Math.abs(n) * 100) / 100;
  const [intStr, decStrRaw = ""] = String(abs).split(".");
  const decStr = decStrRaw.padEnd(2, "0").slice(0, 2);

  // æ•´æ•°éƒ¨åˆ†ï¼šæŒ‰ 4 ä½åˆ†æ®µ
  const segs: string[] = [];
  let t = intStr;
  while (t.length > 0) {
    segs.unshift(t.slice(-4));
    t = t.slice(0, -4);
  }

  let r = "";
  let lastHadValue = false;
  for (let i = 0; i < segs.length; i++) {
    const s = chineseGroup4(segs[i]);
    const ui = segs.length - 1 - i;
    if (s) {
      if (r && !lastHadValue) r += "é›¶";
      r += s + CN_UNIT_HI[ui];
      lastHadValue = true;
    } else {
      if (r) lastHadValue = false;
    }
  }
  if (!r) r = "é›¶";
  r += "pesos";

  const j = +decStr[0];
  const f = +decStr[1];
  if (j === 0 && f === 0) {
    r += "æ•´";
  } else {
    if (j > 0) r += CN_DIGIT[j] + "è§’";
    else if (f > 0) r += "é›¶";
    if (f > 0) r += CN_DIGIT[f] + "åˆ†";
  }
  return (neg ? "è´Ÿ" : "") + r;
}

