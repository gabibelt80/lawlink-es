import { describe, it, expect } from "vitest";
import { periodPresets, customPeriod } from "@/server/reports/queries";

function ymd(d: Date): [number, number, number] {
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()];
}

describe("periodPresets", () => {
  it("2026-05-26 â†’ æœ¬æœˆ = 2026-05-01 åˆ° 2026-06-01", () => {
    const p = periodPresets(new Date(2026, 4, 26));
    expect(ymd(p.month.start)).toEqual([2026, 5, 1]);
    expect(ymd(p.month.end)).toEqual([2026, 6, 1]);
    expect(p.month.label).toBe("2026 å¹´ 5 æœˆ");
  });

  it("2026-05-26 â†’ æœ¬å­£ = 2026 Q2ï¼ˆ4-7 æœˆï¼‰", () => {
    const p = periodPresets(new Date(2026, 4, 26));
    expect(ymd(p.quarter.start)).toEqual([2026, 4, 1]);
    expect(ymd(p.quarter.end)).toEqual([2026, 7, 1]);
    expect(p.quarter.label).toBe("2026 å¹´ Q2");
  });

  it("2026-05-26 â†’ æœ¬å¹´ = 2026-01-01 åˆ° 2027-01-01", () => {
    const p = periodPresets(new Date(2026, 4, 26));
    expect(ymd(p.year.start)).toEqual([2026, 1, 1]);
    expect(ymd(p.year.end)).toEqual([2027, 1, 1]);
    expect(p.year.label).toBe("2026 å¹´åº¦");
  });

  it("2026-05-26 â†’ ä¸Šå¹´ = 2025-01-01 åˆ° 2026-01-01", () => {
    const p = periodPresets(new Date(2026, 4, 26));
    expect(ymd(p.lastYear.start)).toEqual([2025, 1, 1]);
    expect(ymd(p.lastYear.end)).toEqual([2026, 1, 1]);
    expect(p.lastYear.label).toBe("2025 å¹´åº¦");
  });

  it("Q1ï¼ˆ1 æœˆï¼‰è¾¹ç•Œ", () => {
    const p = periodPresets(new Date(2026, 0, 15));
    expect(ymd(p.quarter.start)).toEqual([2026, 1, 1]);
    expect(ymd(p.quarter.end)).toEqual([2026, 4, 1]);
    expect(p.quarter.label).toBe("2026 å¹´ Q1");
  });

  it("Q4ï¼ˆ12 æœˆï¼‰è¾¹ç•Œï¼Œæœ¬æœˆ end è·¨å¹´", () => {
    const p = periodPresets(new Date(2026, 11, 31));
    expect(ymd(p.month.start)).toEqual([2026, 12, 1]);
    expect(ymd(p.month.end)).toEqual([2027, 1, 1]);
    expect(ymd(p.quarter.start)).toEqual([2026, 10, 1]);
    expect(ymd(p.quarter.end)).toEqual([2027, 1, 1]);
  });
});

describe("customPeriod", () => {
  it("2026-01-01 ~ 2026-03-31 â†’ start=01-01, end=04-01ï¼ˆå«æœ«æ—¥ â†’ åŠå¼€ +1ï¼‰", () => {
    const p = customPeriod("2026-01-01", "2026-03-31");
    expect(ymd(p.start)).toEqual([2026, 1, 1]);
    expect(ymd(p.end)).toEqual([2026, 4, 1]);
    expect(p.label).toBe("2026-01-01 ~ 2026-03-31");
  });

  it("æœˆæœ«è·¨æœˆæ­£ç¡®é€’å¢žï¼ˆ2026-01-31 â†’ 2026-02-01ï¼‰", () => {
    const p = customPeriod("2026-01-01", "2026-01-31");
    expect(ymd(p.end)).toEqual([2026, 2, 1]);
  });

  it("Fechaæ ¼å¼ä¸åˆæ³•æŠ›é”™", () => {
    expect(() => customPeriod("2026/01/01", "2026-03-31")).toThrow(/æ ¼å¼/);
    expect(() => customPeriod("2026-1-1", "2026-3-31")).toThrow(/æ ¼å¼/);
  });

  it("åŒä¸€dÃ­asåˆæ³•ï¼ˆå«å½“dÃ­as â†’ åŠå¼€ +1 åŽä» > startï¼‰", () => {
    expect(() => customPeriod("2026-03-01", "2026-03-01")).not.toThrow();
  });

  it("end < start æŠ›é”™", () => {
    expect(() => customPeriod("2026-03-01", "2026-02-28")).toThrow(/æ™šäºŽ/);
  });

  it("è·¨åº¦ > 5 å¹´æŠ›é”™", () => {
    expect(() => customPeriod("2020-01-01", "2026-01-02")).toThrow(/5 å¹´/);
  });

  it("æ­£å¥½ 5 å¹´å†…åˆæ³•", () => {
    expect(() => customPeriod("2021-01-01", "2025-12-31")).not.toThrow();
  });
});

