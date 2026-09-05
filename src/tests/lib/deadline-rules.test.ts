import { describe, expect, it } from "vitest";
import {
  buildDeadlineBasis,
  computeDeadlineDate,
  formatLocalDate,
  periodLabel
} from "@/lib/deadline-rules";

const d = (s: string) => new Date(`${s}T00:00:00`);

describe("computeDeadlineDate", () => {
  it("æŒ‰Fechaé—´ï¼šå¼€å§‹ä¹‹æ—¥ä¸è®¡å…¥ï¼ŒFecha de vencimiento = è§¦å‘æ—¥ + N æ—¥ï¼ˆæ°‘è¯‰æ³•ç¬¬85æ¡ï¼‰", () => {
    // åˆ¤å†³ä¹¦ 7/1 é€è¾¾ï¼Œä¸Šè¯‰æœŸ 15 æ—¥ â†’ 7/16 å±Šæ»¡
    expect(formatLocalDate(computeDeadlineDate(d("2026-07-01"), 15, "DAYS"))).toBe("2026-07-16");
    // è£å®š 10 æ—¥
    expect(formatLocalDate(computeDeadlineDate(d("2026-07-01"), 10, "DAYS"))).toBe("2026-07-11");
    // è·¨æœˆ
    expect(formatLocalDate(computeDeadlineDate(d("2026-01-25"), 15, "DAYS"))).toBe("2026-02-09");
  });

  it("æŒ‰æœˆæœŸé—´ï¼šåˆ°æœŸæœˆå¯¹åº”æ—¥", () => {
    // å†å®¡ 6 ä¸ªæœˆ
    expect(formatLocalDate(computeDeadlineDate(d("2026-01-15"), 6, "MONTHS"))).toBe("2026-07-15");
    // æ’¤è£ 3 ä¸ªæœˆ
    expect(formatLocalDate(computeDeadlineDate(d("2026-03-10"), 3, "MONTHS"))).toBe("2026-06-10");
  });

  it("æŒ‰æœˆæœŸé—´ï¼šåˆ°æœŸæœˆæ— å¯¹åº”æ—¥å–æœˆæœ«", () => {
    // 1/31 + 1 ä¸ªæœˆ â†’ 2 æœˆæ—  31 æ—¥ â†’ 2/28ï¼ˆ2026 éžé—°å¹´ï¼‰
    expect(formatLocalDate(computeDeadlineDate(d("2026-01-31"), 1, "MONTHS"))).toBe("2026-02-28");
    // é—°å¹´ 2/29
    expect(formatLocalDate(computeDeadlineDate(d("2028-01-31"), 1, "MONTHS"))).toBe("2028-02-29");
    // 8/31 + 6 ä¸ªæœˆ â†’ æ¬¡å¹´ 2 æœˆæœ«
    expect(formatLocalDate(computeDeadlineDate(d("2026-08-31"), 6, "MONTHS"))).toBe("2027-02-28");
  });

  it("æŒ‰å¹´æœŸé—´ï¼šç”³è¯·æ‰§è¡Œ 2 å¹´", () => {
    expect(formatLocalDate(computeDeadlineDate(d("2026-07-04"), 2, "YEARS"))).toBe("2028-07-04");
    // é—°æ—¥è§¦å‘ â†’ å¹³å¹´å– 2/28
    expect(formatLocalDate(computeDeadlineDate(d("2028-02-29"), 1, "YEARS"))).toBe("2029-02-28");
  });

  it("å¿½ç•¥è§¦å‘æ—¥çš„æ—¶é—´éƒ¨åˆ†", () => {
    const withTime = new Date("2026-07-01T18:30:00");
    expect(formatLocalDate(computeDeadlineDate(withTime, 15, "DAYS"))).toBe("2026-07-16");
  });

  it("éžæ³•Plazoæ•°å€¼æŠ¥é”™", () => {
    expect(() => computeDeadlineDate(d("2026-07-01"), 0, "DAYS")).toThrow();
    expect(() => computeDeadlineDate(d("2026-07-01"), -5, "DAYS")).toThrow();
    expect(() => computeDeadlineDate(d("2026-07-01"), 1.5, "DAYS")).toThrow();
  });
});

describe("periodLabel / buildDeadlineBasis", () => {
  it("Plazoå•ä½ä¸­æ–‡æ ‡ç­¾", () => {
    expect(periodLabel(15, "DAYS")).toBe("15 æ—¥");
    expect(periodLabel(6, "MONTHS")).toBe("6 ä¸ªæœˆ");
    expect(periodLabel(2, "YEARS")).toBe("2 å¹´");
  });

  it("basis æ–‡æœ¬åŒ…å«æ³•æ¡ã€è§¦å‘Fechayé¡ºå»¶æç¤ºï¼Œä¸”ä¸è¶…è¿‡ 200 å­—ï¼ˆschema ä¸Šé™ï¼‰", () => {
    const basis = buildDeadlineBasis({
      legalBasis: "ã€Šä¸­åŽäººæ°‘å…±å’Œå›½æ°‘äº‹è¯‰è®¼æ³•ï¼ˆ2023ä¿®æ­£ï¼‰ã€‹ç¬¬ä¸€ç™¾ä¸ƒåä¸€æ¡",
      triggerLabel: "åˆ¤å†³ä¹¦é€è¾¾ä¹‹æ—¥",
      triggerDate: d("2026-07-01"),
      periodValue: 15,
      periodUnit: "DAYS"
    });
    expect(basis).toContain("ç¬¬ä¸€ç™¾ä¸ƒåä¸€æ¡");
    expect(basis).toContain("2026-07-01");
    expect(basis).toContain("15 æ—¥");
    expect(basis).toContain("æ³•å®šä¼‘å‡æ—¥");
    expect(basis.length).toBeLessThanOrEqual(200);
  });
});

