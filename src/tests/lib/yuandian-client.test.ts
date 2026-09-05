import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  searchPtalCases,
  buildCaseDetailUrl,
  YuandianApiError,
  YuandianNotConfiguredError
} from "@/lib/yuandian/client";
import type { ResolvedYuandianSettings } from "@/lib/yuandian/settings";

const configuredSettings: ResolvedYuandianSettings = {
  apiKey: "test_key",
  baseUrl: "https://open.example.com/open",
  caseDetailHost: "https://www.example.com",
  configured: true
};

const unconfiguredSettings: ResolvedYuandianSettings = {
  ...configuredSettings,
  apiKey: "",
  configured: false
};

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as never;
});

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body)
  } as unknown as Response;
}

describe("searchPtalCases", () => {
  it("æœªé…ç½® apiKey â†’ æŠ› YuandianNotConfiguredError", async () => {
    await expect(
      searchPtalCases({ ay: ["æ°‘é—´å€Ÿè´·çº çº·"] }, unconfiguredSettings)
    ).rejects.toBeInstanceOf(YuandianNotConfiguredError);
  });

  it("æ‰€æœ‰è¿‡æ»¤æ¡ä»¶éƒ½ç©º â†’ æŠ›é”™ï¼ˆpesoså…¸è¦æ±‚ body éžç©ºï¼‰", async () => {
    await expect(searchPtalCases({}, configuredSettings)).rejects.toThrow(/è‡³å°‘å¡«å†™ä¸€ä¸ª/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("æ­£å¸¸è¯·æ±‚ï¼šbody æž„é€  + å“åº”è§£æž", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        status: "success",
        code: 200,
        data: {
          total: 2,
          lst: [
            {
              type: "æ™®é€šæ¡ˆä¾‹",
              id: "abc",
              ah: "ï¼ˆ2022ï¼‰äº¬æ°‘ç»ˆ1å·",
              title: "ç”²è¯‰ä¹™",
              ay: ["æ°‘é—´å€Ÿè´·çº çº·"],
              jbdw: "åŒ—äº¬å¸‚ç¬¬ä¸‰ä¸­é™¢",
              ajlb: "æ°‘äº‹Caso",
              xzqh_p: "åŒ—äº¬",
              wszl: "åˆ¤å†³ä¹¦",
              cprq: "2022å¹´01æœˆ01æ—¥",
              content: "ç‰‡æ®µ",
              url: "/ydzk/caseDetail/case/abc",
              score: 9.9
            }
          ]
        }
      })
    );

    const res = await searchPtalCases(
      { ay: ["æ°‘é—´å€Ÿè´·çº çº·"], qw: "è¿çº¦ Vencido", top_k: 3 },
      configuredSettings
    );
    expect(res.total).toBe(2);
    expect(res.items).toHaveLength(1);
    expect(res.items[0].id).toBe("abc");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://open.example.com/open/rh_ptal_search");
    expect(init.method).toBe("POST");
    expect(init.headers["X-API-Key"]).toBe("test_key");
    const body = JSON.parse(init.body as string);
    expect(body.ay).toEqual(["æ°‘é—´å€Ÿè´·çº çº·"]);
    expect(body.qw).toBe("è¿çº¦ Vencido");
    expect(body.search_mode).toBe("and");
    expect(body.top_k).toBe(3);
  });

  it("data === nullï¼ˆæœªå‘½ä¸­ï¼‰â†’ Volverç©º", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ status: "success", code: 200, data: null, message: "æœªæŸ¥è¯¢åˆ°ç›¸å…³å†…å®¹" })
    );
    const res = await searchPtalCases({ qw: "æžå°æ¦‚çŽ‡" }, configuredSettings);
    expect(res.total).toBe(0);
    expect(res.items).toEqual([]);
  });

  it("status=failed â†’ æŠ› YuandianApiError", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ status: "failed", code: 500, message: "search_mode ä¸åˆæ³•" })
    );
    await expect(searchPtalCases({ qw: "x" }, configuredSettings)).rejects.toBeInstanceOf(
      YuandianApiError
    );
  });

  it("HTTP 401 â†’ æŠ› YuandianApiError", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 401));
    await expect(searchPtalCases({ qw: "x" }, configuredSettings)).rejects.toBeInstanceOf(
      YuandianApiError
    );
  });

  it("top_k è¾¹ç•Œï¼š>50 è£åˆ° 50ï¼Œ<1 è£åˆ° 1", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ status: "success", code: 200, data: { total: 0, lst: [] } })
    );

    await searchPtalCases({ qw: "x", top_k: 999 }, configuredSettings);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).top_k).toBe(50);

    await searchPtalCases({ qw: "x", top_k: -3 }, configuredSettings);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).top_k).toBe(1);
  });

  it("ç©ºç™½ qw ä¸è¿› body", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ status: "success", code: 200, data: { total: 0, lst: [] } })
    );
    await searchPtalCases({ ay: ["x"], qw: "   " }, configuredSettings);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.qw).toBeUndefined();
    expect(body.search_mode).toBeUndefined();
  });
});

describe("buildCaseDetailUrl", () => {
  it("æ‹¼æŽ¥ host + path", () => {
    expect(
      buildCaseDetailUrl("https://www.example.com", "/ydzk/caseDetail/case/abc")
    ).toBe("https://www.example.com/ydzk/caseDetail/case/abc");
  });
  it("host å°¾ / y path å¤´ / å®¹é”™", () => {
    expect(buildCaseDetailUrl("https://www.example.com/", "ydzk/x")).toBe(
      "https://www.example.com/ydzk/x"
    );
  });
});

