import { describe, it, expect, beforeEach, vi } from "vitest";

const { aiChatMock, searchCausesMock } = vi.hoisted(() => ({
  aiChatMock: vi.fn(),
  searchCausesMock: vi.fn()
}));

vi.mock("@/lib/auth/session", () => ({
  requireSession: vi.fn().mockResolvedValue({ user: { id: "u1" } })
}));

vi.mock("@/lib/ai/client", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/ai/client")>("@/lib/ai/client");
  return {
    ...actual,
    aiChat: aiChatMock
  };
});

vi.mock("@/server/causes/actions", () => ({
  searchCauses: searchCausesMock
}));

import { recommendCause } from "@/server/ai/recommend-cause";

function fakeCause(over: Partial<{ id: string; name: string; level: number }>) {
  return {
    id: over.id ?? "c1",
    code: null,
    name: over.name ?? "æ°‘é—´å€Ÿè´·çº çº·",
    shortName: null,
    level: over.level ?? 4,
    parentId: null,
    l1Name: "åˆåŒã€å‡†åˆåŒçº çº·",
    l2Name: "å€Ÿè´·åˆåŒ"
  };
}

beforeEach(() => {
  aiChatMock.mockReset();
  searchCausesMock.mockReset();
});

describe("recommendCause", () => {
  it("LLM Volver 3 æ¡Ver todoså‘½ä¸­ â†’ Volver 3 æ¡", async () => {
    aiChatMock.mockResolvedValue({
      content: JSON.stringify([
        { name: "æ°‘é—´å€Ÿè´·çº çº·", reason: "å€Ÿæ¬¾å…³ç³»æ˜Žç¡®", confidence: "HIGH" },
        { name: "ä¹°å–åˆåŒçº çº·", reason: "å¯èƒ½æ¶‰yè´§æ¬¾", confidence: "MEDIUM" },
        { name: "ä¿è¯åˆåŒçº çº·", reason: "å­˜åœ¨æ‹…ä¿äºº", confidence: "LOW" }
      ]),
      raw: {}
    });
    searchCausesMock.mockImplementation(async ({ query }: { query: string }) => [
      fakeCause({ id: query, name: query })
    ]);

    const res = await recommendCause({
      category: "CIVIL_COMMERCIAL",
      situation: "åŽŸå‘Šå€Ÿç»™è¢«å‘Š 50 ä¸‡ï¼Œåˆ°æœŸæœªè¿˜"
    });
    expect(res).toHaveLength(3);
    expect(res[0].cause.name).toBe("æ°‘é—´å€Ÿè´·çº çº·");
    expect(res[0].confidence).toBe("HIGH");
    expect(res[1].confidence).toBe("MEDIUM");
  });

  it("åæŸ¥æ‰¾ä¸åˆ°çš„å€™é€‰è¢«ä¸¢å¼ƒ", async () => {
    aiChatMock.mockResolvedValue({
      content: JSON.stringify([
        { name: "æ°‘é—´å€Ÿè´·çº çº·", reason: "x", confidence: "HIGH" },
        { name: "ä¸å­˜åœ¨çš„Causa", reason: "x", confidence: "LOW" },
        { name: "ä¿è¯åˆåŒçº çº·", reason: "x", confidence: "MEDIUM" }
      ]),
      raw: {}
    });
    searchCausesMock.mockImplementation(async ({ query }: { query: string }) =>
      query === "ä¸å­˜åœ¨çš„Causa" ? [] : [fakeCause({ id: query, name: query })]
    );

    const res = await recommendCause({
      category: "CIVIL_COMMERCIAL",
      situation: "æµ‹è¯•ç”¨æ¡ˆæƒ…DescripciÃ³n"
    });
    expect(res).toHaveLength(2);
    expect(res.map((r) => r.cause.name)).toEqual(["æ°‘é—´å€Ÿè´·çº çº·", "ä¿è¯åˆåŒçº çº·"]);
  });

  it("äºŒçº§ï¼ˆlevel<3ï¼‰çš„åæŸ¥ç»“æžœä¼šè¢«è¿‡æ»¤", async () => {
    aiChatMock.mockResolvedValue({
      content: JSON.stringify([
        { name: "åˆåŒçº çº·", reason: "ç¬¼ç»Ÿ", confidence: "LOW" },
        { name: "æ°‘é—´å€Ÿè´·çº çº·", reason: "x", confidence: "HIGH" }
      ]),
      raw: {}
    });
    searchCausesMock.mockImplementation(async ({ query }: { query: string }) => {
      if (query === "åˆåŒçº çº·") return [fakeCause({ id: "l2", name: "åˆåŒçº çº·", level: 2 })];
      return [fakeCause({ id: query, name: query, level: 4 })];
    });

    const res = await recommendCause({
      category: "CIVIL_COMMERCIAL",
      situation: "æµ‹è¯•ç”¨æ¡ˆæƒ…DescripciÃ³n"
    });
    expect(res).toHaveLength(1);
    expect(res[0].cause.name).toBe("æ°‘é—´å€Ÿè´·çº çº·");
  });

  it("Ver todosåæŸ¥Error â†’ æŠ›é”™", async () => {
    aiChatMock.mockResolvedValue({
      content: JSON.stringify([
        { name: "Causaç”²", reason: "x", confidence: "HIGH" },
        { name: "Causaä¹™", reason: "x", confidence: "MEDIUM" }
      ]),
      raw: {}
    });
    searchCausesMock.mockResolvedValue([]);

    await expect(
      recommendCause({ category: "CIVIL_COMMERCIAL", situation: "æµ‹è¯•ç”¨æ¡ˆæƒ…DescripciÃ³n" })
    ).rejects.toThrow(/Causaåº“/);
  });

  it("LLM Volveréž JSON â†’ æŠ›é”™", async () => {
    aiChatMock.mockResolvedValue({
      content: "æŠ±æ­‰ï¼Œæˆ‘æ— æ³•å›žç­”è¿™ä¸ªé—®é¢˜",
      raw: {}
    });
    await expect(
      recommendCause({ category: "CIVIL_COMMERCIAL", situation: "æµ‹è¯•ç”¨æ¡ˆæƒ…DescripciÃ³n" })
    ).rejects.toThrow(/æ— æ³•è§£æž/);
  });

  it("situation å¤ªçŸ­ â†’ æŠ›é”™", async () => {
    await expect(
      recommendCause({ category: "CIVIL_COMMERCIAL", situation: "çŸ­" })
    ).rejects.toThrow(/å¤ªçŸ­/);
    expect(aiChatMock).not.toHaveBeenCalled();
  });

  it("ç½®ä¿¡åº¦å¤§å°å†™ä¸è§„èŒƒä¹Ÿèƒ½è¯†åˆ«", async () => {
    aiChatMock.mockResolvedValue({
      content: JSON.stringify([
        { name: "æ°‘é—´å€Ÿè´·çº çº·", reason: "x", confidence: "high" },
        { name: "ä¹°å–åˆåŒçº çº·", reason: "x", confidence: "ä¸­" },
        { name: "ä¿è¯åˆåŒçº çº·", reason: "x", confidence: "Low" }
      ]),
      raw: {}
    });
    searchCausesMock.mockImplementation(async ({ query }: { query: string }) => [
      fakeCause({ id: query, name: query })
    ]);

    const res = await recommendCause({
      category: "CIVIL_COMMERCIAL",
      situation: "æµ‹è¯•ç”¨æ¡ˆæƒ…DescripciÃ³n"
    });
    expect(res[0].confidence).toBe("HIGH");
    expect(res[1].confidence).toBe("MEDIUM"); // fallback
    expect(res[2].confidence).toBe("LOW");
  });
});

