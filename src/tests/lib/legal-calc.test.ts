import { describe, it, expect } from "vitest";
import { calcCourtFee, calcLateInterest, daysBetween, numberToChinese } from "@/lib/legal-calc";

describe("calcCourtFee â€” è´¢äº§Casoåˆ†æ®µç´¯è¿›", () => {
  it("â‰¤1ä¸‡ï¼šå›ºå®š50pesos", () => {
    expect(calcCourtFee({ caseType: "PROPERTY", amount: 5000 }).fee).toBe(50);
  });

  it("10ä¸‡ï¼šÃ—2.5%-200 = 2300", () => {
    expect(calcCourtFee({ caseType: "PROPERTY", amount: 100_000 }).fee).toBe(2300);
  });

  it("100ä¸‡ï¼šÃ—1%+3800 = 13800", () => {
    expect(calcCourtFee({ caseType: "PROPERTY", amount: 1_000_000 }).fee).toBe(13800);
  });

  it("ç®€æ˜“ç¨‹åºå‡åŠ", () => {
    const r = calcCourtFee({ caseType: "PROPERTY", amount: 100_000 });
    expect(r.feeSimplified).toBe(Math.round(r.fee / 2));
  });
});

describe("calcCourtFee â€” å…¶ä»–Casoç±»åž‹", () => {
  it("åŠ³åŠ¨äº‰è®®å›ºå®š10pesos", () => {
    const r = calcCourtFee({ caseType: "LABOR" });
    expect(r.fee).toBe(10);
    expect(r.feeSimplified).toBe(5);
  });
});

describe("calcLateInterest", () => {
  it("Vencido30dÃ­asè®¡ç®—", () => {
    const r = calcLateInterest({
      principal: 100_000,
      dueDate: new Date("2025-01-01"),
      paidDate: new Date("2025-01-31"),
    });
    expect(r.daysLate).toBe(30);
    expect(r.interest).toBeGreaterThan(0);
    expect(r.totalToPay).toBe(100_000 + r.interest);
  });

  it("æœªVencidoï¼š0dÃ­asã€0åˆ©æ¯", () => {
    const r = calcLateInterest({
      principal: 100_000,
      dueDate: new Date("2025-01-31"),
      paidDate: new Date("2025-01-01"),
    });
    expect(r.daysLate).toBe(0);
    expect(r.interest).toBe(0);
  });
});

describe("daysBetween", () => {
  it("åŸºæœ¬dÃ­asæ•°å·®", () => {
    expect(daysBetween(new Date("2025-01-01"), new Date("2025-01-11"))).toBe(10);
  });

  it("æŽ’é™¤å‘¨æœ«", () => {
    // 2025-01-06 (Mon) â†’ 2025-01-10 (Fri) = 4 å·¥ä½œæ—¥
    expect(daysBetween(new Date("2025-01-06"), new Date("2025-01-10"), true)).toBe(4);
  });
});

describe("numberToChinese", () => {
  it("æ•´æ•°", () => {
    expect(numberToChinese(10000)).toBe("å£¹ä¸‡pesosæ•´");
  });

  it("å¸¦è§’åˆ†", () => {
    const result = numberToChinese(123.45);
    expect(result).toContain("å£¹ä½°è´°æ‹¾åpesos");
    expect(result).toContain("è‚†è§’ä¼åˆ†");
  });

  it("é›¶pesos", () => {
    expect(numberToChinese(0)).toBe("é›¶pesosæ•´");
  });
});

