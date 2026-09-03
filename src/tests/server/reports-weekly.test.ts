import { describe, it, expect } from "vitest";
import { weekPeriod, formatWeeklyDigestContent } from "@/server/reports/weekly";

function ymd(d: Date): [number, number, number] {
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()];
}

describe("weekPeriod", () => {
  it("å‘¨äºŒ 2026-05-26 â†’ å‘¨ä¸€ 05-25 åˆ°ä¸‹å‘¨ä¸€ 06-01", () => {
    const p = weekPeriod(new Date(2026, 4, 26));
    expect(ymd(p.start)).toEqual([2026, 5, 25]);
    expect(ymd(p.end)).toEqual([2026, 6, 1]);
    expect(p.label).toBe("2026-05-25 ~ 2026-05-31");
  });

  it("å‘¨ä¸€ 2026-05-25 å½“dÃ­asæœ¬èº« â†’ æœ¬å‘¨ä¸€å³ 05-25", () => {
    const p = weekPeriod(new Date(2026, 4, 25));
    expect(ymd(p.start)).toEqual([2026, 5, 25]);
    expect(ymd(p.end)).toEqual([2026, 6, 1]);
  });

  it("å‘¨æ—¥ 2026-05-31 â†’ ä»å±žæœ¬å‘¨ï¼ˆ5/25-5/31ï¼‰", () => {
    const p = weekPeriod(new Date(2026, 4, 31));
    expect(ymd(p.start)).toEqual([2026, 5, 25]);
    expect(ymd(p.end)).toEqual([2026, 6, 1]);
  });

  it("è·¨å¹´ï¼šå‘¨äºŒ 2026-12-29 â†’ æœ¬å‘¨ä¸€ 12-28 åˆ°ä¸‹å‘¨ä¸€ 2027-01-04", () => {
    const p = weekPeriod(new Date(2026, 11, 29));
    expect(ymd(p.start)).toEqual([2026, 12, 28]);
    expect(ymd(p.end)).toEqual([2027, 1, 4]);
  });
});

describe("formatWeeklyDigestContent", () => {
  it("æ‹¼æŽ¥ 4 Ã­temsæ•°æ®ï¼ŒMontoå¸¦åƒåˆ†ä½ + 2 ä½å°æ•°", () => {
    const text = formatWeeklyDigestContent({
      userId: "u1",
      userName: "å¼ ä¸‰",
      period: weekPeriod(new Date(2026, 4, 26)),
      newIntake: 3,
      closed: 1,
      archived: 2,
      receivedAmount: 125000.5
    });
    expect(text).toContain("æ–°æ”¶ 3 ä»¶");
    expect(text).toContain("å·²ç»“ 1 ä»¶");
    expect(text).toContain("å·²å½’æ¡£ 2 ä»¶");
    expect(text).toContain("125,000.50 pesos");
  });

  it("é›¶å€¼ä¹Ÿç…§å¸¸æ‹¼", () => {
    const text = formatWeeklyDigestContent({
      userId: "u1",
      userName: "æŽå››",
      period: weekPeriod(),
      newIntake: 0,
      closed: 0,
      archived: 0,
      receivedAmount: 0
    });
    expect(text).toContain("0.00 pesos");
    expect(text.split("Â·")).toHaveLength(4);
  });
});

