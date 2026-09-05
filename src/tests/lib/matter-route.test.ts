import { describe, expect, it } from "vitest";
import { matterHref, normalizeMatterParam } from "@/lib/matters/route";

describe("matterHref", () => {
  it("ç”¨ internalCode ä½œè·¯ç”±é”®", () => {
    expect(matterHref({ id: "cmq3lxgrm002nitzfhh8qn8ql", internalCode: "M-2026-001" })).toBe(
      "/matters/M-2026-001"
    );
  });

  it("internalCode ä¸ºç©ºæ—¶å›žé€€åˆ° idï¼ŒEnlaceä¸ä¼šæ–­", () => {
    expect(matterHref({ id: "cmq3lxgrm002nitzfhh8qn8ql", internalCode: null })).toBe(
      "/matters/cmq3lxgrm002nitzfhh8qn8ql"
    );
    expect(matterHref({ id: "cmq3lxgrm002nitzfhh8qn8ql", internalCode: "  " })).toBe(
      "/matters/cmq3lxgrm002nitzfhh8qn8ql"
    );
  });

  it("æ”¯æŒå­è·¯å¾„åŽç¼€", () => {
    expect(matterHref({ id: "x", internalCode: "LL-2026-CC-0001" }, "#finance")).toBe(
      "/matters/LL-2026-CC-0001#finance"
    );
  });

  it("å¯¹ç¼–å·åš URL CÃ³digoï¼Œå¼‚å¸¸å­—ç¬¦ä¸ä¼šç ´ååœ°å€", () => {
    expect(matterHref({ id: "x", internalCode: "M 2026/001" })).toBe("/matters/M%202026%2F001");
  });
});

describe("normalizeMatterParam", () => {
  it("æ‰‹æ‰“å°å†™åœ°å€èƒ½å‘½ä¸­", () => {
    expect(normalizeMatterParam("m-2026-001")).toBe("M-2026-001");
  });

  it("åŽ»æŽ‰é¦–å°¾ç©ºç™½", () => {
    expect(normalizeMatterParam("  M-2026-001 ")).toBe("M-2026-001");
  });

  it("å…ˆåš URL è§£ç ", () => {
    expect(normalizeMatterParam("M%2D2026%2D001")).toBe("M-2026-001");
  });

  it("å‚æ•°é‡Œæœ‰è£¸ % æ—¶ä¸æŠ›å¼‚å¸¸", () => {
    expect(() => normalizeMatterParam("M-2026-100%")).not.toThrow();
    expect(normalizeMatterParam("M-2026-100%")).toBe("M-2026-100%");
  });

  it("cuid åŽŸæ ·ä¿ç•™ï¼ˆå¤§å†™åŒ–ä¸å½±å“æŒ‰ id Coincidenciaï¼‰", () => {
    expect(normalizeMatterParam("cmq3lxgrm002nitzfhh8qn8ql")).toBe(
      "CMQ3LXGRM002NITZFHH8QN8QL"
    );
  });
});

