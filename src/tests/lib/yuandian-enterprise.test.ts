import { describe, it, expect, beforeEach, vi } from "vitest";
import { getEnterpriseSummary } from "@/lib/yuandian/enterprise";
import { YuandianNotConfiguredError, YuandianApiError } from "@/lib/yuandian/client";
import type { ResolvedYuandianSettings } from "@/lib/yuandian/settings";

const configured: ResolvedYuandianSettings = {
  apiKey: "k",
  baseUrl: "https://open.example.com/open",
  caseDetailHost: "https://www.example.com",
  configured: true
};

const unconfigured: ResolvedYuandianSettings = {
  ...configured,
  apiKey: "",
  configured: false
};

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as never;
});

function jsonRes(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body)
  } as unknown as Response;
}

// å®Œæ•´èšåˆ mock æ•°æ®ç”Ÿæˆå™¨
function aggData(
  overrides: Partial<{
    å¤±ä¿¡è¢«æ‰§è¡Œäºº: number;
    è¢«æ‰§è¡Œäºº: number;
    è‚¡æƒå†»ç»“: number;
    ä¸¥é‡è¿æ³•: number;
    ç»è¥å¼‚å¸¸: number;
  }> = {}
) {
  const v = {
    å¤±ä¿¡è¢«æ‰§è¡Œäºº: 0,
    è¢«æ‰§è¡Œäºº: 0,
    è‚¡æƒå†»ç»“: 0,
    ä¸¥é‡è¿æ³•: 0,
    ç»è¥å¼‚å¸¸: 0,
    ...overrides
  };
  return {
    status: "success",
    code: 200,
    data: {
      id: "eid-1",
      name: "æµ‹è¯•å…¬å¸",
      å¤±ä¿¡è¢«æ‰§è¡Œäººç»Ÿè®¡: { Totalæ•°: v.å¤±ä¿¡è¢«æ‰§è¡Œäºº, çœä»½: [] },
      è¢«æ‰§è¡Œäººç»Ÿè®¡: { Totalæ•°: v.è¢«æ‰§è¡Œäºº, ç«‹æ¡ˆå¹´ä»½: [] },
      è‚¡æƒå†»ç»“ç»Ÿè®¡: { Totalæ•°: v.è‚¡æƒå†»ç»“ },
      ä¸¥é‡è¿æ³•ç»Ÿè®¡: { Totalæ•°: v.ä¸¥é‡è¿æ³•, ç±»åˆ«: [{ key: "é‡å¤§", count: v.ä¸¥é‡è¿æ³• }] },
      ç»è¥å¼‚å¸¸ç»Ÿè®¡: { Totalæ•°: v.ç»è¥å¼‚å¸¸, åˆ—å…¥ç»è¥å¼‚å¸¸åå½•Motivo: [] },
      æ³•é™¢Anuncioç»Ÿè®¡: {
        Totalæ•°: 5,
        èµ·è¯‰æ–¹: 1,
        åº”è¯‰æ–¹: 4,
        æ³•é™¢: [
          { key: "åŒ—äº¬æµ·æ·€æ³•é™¢", count: 3 },
          { key: "ä¸Šæµ·æµ¦ä¸œæ³•é™¢", count: 2 }
        ]
      },
      å¼€åº­Anuncioç»Ÿè®¡: { Totalæ•°: 10, èµ·è¯‰æ–¹: 2, åº”è¯‰æ–¹: 8 },
      Administrativoå¤„ç½šç»Ÿè®¡: { Totalæ•°: 0 },
      æ¬ ç¨ŽAnuncioç»Ÿè®¡: { Totalæ•°: 0 },
      å˜æ›´è®°å½•ç»Ÿè®¡: { Totalæ•°: 3 },
      å¯¹å¤–æ‹…ä¿ç»Ÿè®¡: { Totalæ•°: 0 },
      è‚¡æƒå‡ºè´¨ç»Ÿè®¡: { Totalæ•°: 1 },
      å¯¹å¤–æŠ•èµ„ç»Ÿè®¡: { Totalæ•°: 8 },
      å•†æ ‡ç»Ÿè®¡: { Totalæ•°: 50 },
      ä¸“åˆ©ç»Ÿè®¡: { Totalæ•°: 12 },
      è½¯ä»¶è‘—ä½œæƒç»Ÿè®¡: { Totalæ•°: 0 },
      ä½œå“è‘—ä½œæƒç»Ÿè®¡: { Totalæ•°: 0 },
      ç½‘ç«™å¤‡æ¡ˆç»Ÿè®¡: { Totalæ•°: 2 }
    }
  };
}

describe("getEnterpriseSummary", () => {
  it("æœªé…ç½® â†’ throw NotConfigured", async () => {
    await expect(
      getEnterpriseSummary({ id: "x" }, unconfigured)
    ).rejects.toBeInstanceOf(YuandianNotConfiguredError);
  });

  it("id å’Œ socialCode åŒæ—¶ä¸ºç©º â†’ throw", async () => {
    await expect(getEnterpriseSummary({}, configured)).rejects.toThrow(/è‡³å°‘ä¼ ä¸€ä¸ª/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("æ­£å¸¸è¯·æ±‚ï¼šURL å‚æ•° + å­—æ®µæ˜ å°„ + Top æå–", async () => {
    fetchMock.mockResolvedValue(jsonRes(aggData()));
    const r = await getEnterpriseSummary({ id: "eid-1" }, configured);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("rh_enterpriseAggregationSummary?");
    expect(url).toContain("id=eid-1");
    expect(init.method).toBe("GET");
    expect(init.headers["X-API-Key"]).toBe("k");

    expect(r).not.toBeNull();
    expect(r!.id).toBe("eid-1");
    expect(r!.name).toBe("æµ‹è¯•å…¬å¸");
    expect(r!.coreRisks).toHaveLength(5);
    expect(r!.coreRisks.map((c) => c.category)).toEqual([
      "å¤±ä¿¡è¢«æ‰§è¡Œäºº",
      "è¢«æ‰§è¡Œäºº",
      "è‚¡æƒå†»ç»“",
      "ä¸¥é‡è¿æ³•",
      "ç»è¥å¼‚å¸¸"
    ]);
    // æ³•é™¢Anuncio top æå–
    const court = r!.litigation.find((s) => s.category === "æ³•é™¢Anuncio")!;
    expect(court.total).toBe(5);
    expect(court.asPlaintiff).toBe(1);
    expect(court.asDefendant).toBe(4);
    expect(court.top).toEqual([
      { key: "åŒ—äº¬æµ·æ·€æ³•é™¢", count: 3 },
      { key: "ä¸Šæµ·æµ¦ä¸œæ³•é™¢", count: 2 }
    ]);
  });

  it("data === null â†’ Volver null", async () => {
    fetchMock.mockResolvedValue(jsonRes({ status: "success", code: 200, data: null }));
    const r = await getEnterpriseSummary({ socialCode: "abc" }, configured);
    expect(r).toBeNull();
  });

  it("status=failed â†’ æŠ› ApiError", async () => {
    fetchMock.mockResolvedValue(jsonRes({ status: "failed", code: 500, message: "boom" }));
    await expect(
      getEnterpriseSummary({ id: "x" }, configured)
    ).rejects.toBeInstanceOf(YuandianApiError);
  });

  it("HTTP 401 â†’ æŠ› ApiError", async () => {
    fetchMock.mockResolvedValue(jsonRes({}, false, 401));
    await expect(
      getEnterpriseSummary({ id: "x" }, configured)
    ).rejects.toBeInstanceOf(YuandianApiError);
  });

  it("socialCode ä¼˜å…ˆèµ° tyshxydm å‚æ•°", async () => {
    fetchMock.mockResolvedValue(jsonRes(aggData()));
    await getEnterpriseSummary({ socialCode: "91110000XXXX" }, configured);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("tyshxydm=91110000XXXX");
    expect(url).not.toContain("id=");
  });
});

describe("computeRiskLevelï¼ˆAprobarèšåˆå“åº”é—´æŽ¥éªŒè¯ï¼‰", () => {
  it("å¤±ä¿¡è¢«æ‰§è¡Œäºº > 0 â†’ HIGH", async () => {
    fetchMock.mockResolvedValue(jsonRes(aggData({ å¤±ä¿¡è¢«æ‰§è¡Œäºº: 2 })));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    expect(r!.level).toBe("HIGH");
  });

  it("è¢«æ‰§è¡Œäºº > 0ï¼ˆæ— å¤±ä¿¡ï¼‰â†’ MEDIUM", async () => {
    fetchMock.mockResolvedValue(jsonRes(aggData({ è¢«æ‰§è¡Œäºº: 1 })));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    expect(r!.level).toBe("MEDIUM");
  });

  it("è‚¡æƒå†»ç»“ > 0 â†’ MEDIUM", async () => {
    fetchMock.mockResolvedValue(jsonRes(aggData({ è‚¡æƒå†»ç»“: 3 })));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    expect(r!.level).toBe("MEDIUM");
  });

  it("ä¸¥é‡è¿æ³• > 0ï¼ˆæ— è¢«æ‰§è¡Œ/è‚¡æƒå†»ç»“ï¼‰â†’ MEDIUM", async () => {
    fetchMock.mockResolvedValue(jsonRes(aggData({ ä¸¥é‡è¿æ³•: 1 })));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    expect(r!.level).toBe("MEDIUM");
  });

  it("ä»…ç»è¥å¼‚å¸¸ > 0 â†’ LOW", async () => {
    fetchMock.mockResolvedValue(jsonRes(aggData({ ç»è¥å¼‚å¸¸: 1 })));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    expect(r!.level).toBe("LOW");
  });

  it("æ‰€æœ‰æ ¸å¿ƒé£Žé™© = 0 â†’ NONE", async () => {
    fetchMock.mockResolvedValue(jsonRes(aggData()));
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    expect(r!.level).toBe("NONE");
  });

  it("å¤±ä¿¡ + ç»è¥å¼‚å¸¸ åŒæ—¶ > 0 â†’ ä» HIGHï¼ˆæœ€ä¸¥é‡è€…ä¼˜å…ˆï¼‰", async () => {
    fetchMock.mockResolvedValue(
      jsonRes(aggData({ å¤±ä¿¡è¢«æ‰§è¡Œäºº: 1, ç»è¥å¼‚å¸¸: 5 }))
    );
    const r = await getEnterpriseSummary({ id: "x" }, configured);
    expect(r!.level).toBe("HIGH");
  });
});

