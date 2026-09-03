import { describe, it, expect } from "vitest";
import { parseReviewItems } from "@/lib/ai/review-parser";

describe("parseReviewItems", () => {
  it("æ­£å¸¸è·¯å¾„ï¼š4 æ¡ä¸åŒ type / severity è§£æž + æŒ‰ä¸¥é‡åº¦æŽ’åº", () => {
    const json = JSON.stringify([
      { type: "SUGGESTION", severity: "LOW", title: "æŽªè¾žå»ºè®®", detail: "å¯æ”¹ç”¨æ›´è§„èŒƒæœ¯è¯­" },
      { type: "MISSING", severity: "HIGH", title: "è¿çº¦è´£ä»»ç¼ºå¤±", detail: "æœªçº¦å®šè¿çº¦é‡‘è®¡ç®—æ–¹å¼" },
      { type: "RISK", severity: "MEDIUM", title: "ç®¡è¾–çº¦å®šæ¨¡ç³Š", detail: "æœªæŒ‡å®šå…·ä½“æ³•é™¢" },
      { type: "ISSUE", severity: "HIGH", title: "Montoå‰åŽä¸ç¬¦", detail: "æ­£æ–‡ 5 ä¸‡ä½†Adjunto 5.5 ä¸‡" }
    ]);
    const items = parseReviewItems(json);
    expect(items).toHaveLength(4);
    expect(items[0].severity).toBe("HIGH");
    expect(items[1].severity).toBe("HIGH");
    expect(items[2].severity).toBe("MEDIUM");
    expect(items[3].severity).toBe("LOW");
  });

  it("ç©ºæ•°ç»„åˆæ³•", () => {
    expect(parseReviewItems("[]")).toEqual([]);
  });

  it("title/detail ç¼ºå¤±çš„æ¡ç›®ä¸¢å¼ƒ", () => {
    const json = JSON.stringify([
      { type: "RISK", severity: "HIGH", title: "", detail: "x" },
      { type: "RISK", severity: "HIGH", title: "æœ‰æ•ˆ", detail: "" },
      { type: "RISK", severity: "HIGH", title: "ä¿ç•™", detail: "å®Œæ•´" }
    ]);
    const items = parseReviewItems(json);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("ä¿ç•™");
  });

  it("éžæ³• type/severity å›žé€€é»˜è®¤å€¼", () => {
    const json = JSON.stringify([
      { type: "UNKNOWN_TYPE", severity: "CRIT", title: "T", detail: "D" }
    ]);
    const items = parseReviewItems(json);
    expect(items[0].type).toBe("ISSUE");
    expect(items[0].severity).toBe("MEDIUM");
  });

  it("å¤§å°å†™ä¸è§„èŒƒä¹Ÿèƒ½è¯†åˆ«", () => {
    const json = JSON.stringify([
      { type: "missing", severity: "high", title: "T", detail: "D" }
    ]);
    const items = parseReviewItems(json);
    expect(items[0].type).toBe("MISSING");
    expect(items[0].severity).toBe("HIGH");
  });

  it("JSON è¢« markdown ``` åŒ…è£¹ä¹Ÿèƒ½æŠ½å–", () => {
    const wrapped = "å¥½çš„ï¼Œåˆ†æžå¦‚ä¸‹ï¼š\n```json\n[{\"type\":\"RISK\",\"severity\":\"HIGH\",\"title\":\"X\",\"detail\":\"Y\"}]\n```";
    const items = parseReviewItems(wrapped);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("X");
  });

  it("éžæ•°ç»„ï¼ˆå¯¹è±¡ï¼‰æŠ›é”™", () => {
    expect(() => parseReviewItems('{"items": []}')).toThrow(/æ— æ³•è§£æž/);
  });

  it("æ—  JSON æŠ›é”™", () => {
    expect(() => parseReviewItems("æŠ±æ­‰ï¼Œæ— æ³•å¤„ç†")).toThrow(/æ— æ³•è§£æž/);
  });
});

