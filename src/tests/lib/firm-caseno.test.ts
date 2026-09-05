import { describe, it, expect } from "vitest";
import { renderCaseNoTemplate } from "@/lib/matters/firm-caseno";

describe("renderCaseNoTemplate â€” æ‰€å†…æ¡ˆå·æ¨¡æ¿æ¸²æŸ“", () => {
  const base = {
    year: 2026,
    firmShortName: "æ™®",
    categoryAbbr: "æ°‘",
    categoryWord: "æ°‘è¯‰",
    seq: 1
  };

  it("é»˜è®¤æ¨¡æ¿ {å¹´}-{æ‰€}{ç±»è¯}-{åº3} â†’ 2026-æ™®æ°‘è¯‰-001", () => {
    expect(renderCaseNoTemplate("{å¹´}-{æ‰€}{ç±»è¯}-{åº3}", base)).toBe("2026-æ™®æ°‘è¯‰-001");
  });

  it("{å¹´2} å–åŽä¸¤ä½ã€{åº4} è¡¥å››ä½", () => {
    expect(renderCaseNoTemplate("{å¹´2}{ç±»}{åº4}", { ...base, seq: 23 })).toBe("26æ°‘0023");
  });

  it("{ç±»} y {ç±»è¯} äº’ä¸æ±¡æŸ“ï¼ˆ{ç±»è¯} å…ˆæ›¿æ¢ï¼‰", () => {
    expect(renderCaseNoTemplate("{ç±»è¯}/{ç±»}", base)).toBe("æ°‘è¯‰/æ°‘");
  });

  it("æ‰€ç®€ç§°ä¸ºç©ºæ—¶è¯¥æ®µç•™ç©º", () => {
    expect(renderCaseNoTemplate("{å¹´}-{æ‰€}{ç±»è¯}-{åº3}", { ...base, firmShortName: "" })).toBe(
      "2026-æ°‘è¯‰-001"
    );
  });

  it("æµæ°´å¤§äºŽè¡¥ä½å®½åº¦æ—¶ä¸æˆªæ–­", () => {
    expect(renderCaseNoTemplate("{åº3}", { ...base, seq: 1234 })).toBe("1234");
  });
});

