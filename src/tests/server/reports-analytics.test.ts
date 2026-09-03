/**
 * v0.22: æŠ¥è¡¨ analytics èšåˆç®—æ³•æµ‹è¯•ï¼ˆçº¯å‡½æ•°è·¯å¾„ï¼‰
 *
 * getCaseCycleAnalysis / getReviewIssueAnalysis æœ¬èº«ä¾èµ– prismaï¼Œé‡å†™ä¸€ä¸ªçº¯å‡½æ•°
 * ç‰ˆæœ¬ä¸çŽ°å®žï¼›è¿™é‡ŒAprobar mock prisma æµ‹ç®—æ³•ï¼ˆä¸­ä½æ•°ã€ç©ºæ•°æ®ã€JS ç«¯èšåˆï¼‰ã€‚
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const { matterFindManyMock, reviewFindManyMock } = vi.hoisted(() => ({
  matterFindManyMock: vi.fn(),
  reviewFindManyMock: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    matter: { findMany: matterFindManyMock },
    reviewRecord: { findMany: reviewFindManyMock }
  }
}));

import {
  getCaseCycleAnalysis,
  getReviewIssueAnalysis
} from "@/server/reports/analytics";

const period = {
  label: "test",
  start: new Date(2026, 0, 1),
  end: new Date(2027, 0, 1)
};

beforeEach(() => {
  matterFindManyMock.mockReset();
  reviewFindManyMock.mockReset();
});

describe("getCaseCycleAnalysis", () => {
  it("ç©º â†’ ç©ºæ•°ç»„", async () => {
    matterFindManyMock.mockResolvedValue([]);
    const r = await getCaseCycleAnalysis(period);
    expect(r).toEqual([]);
  });

  it("æ°‘äº‹ 5 æ¡è®¡ç®— avg/median/min/max", async () => {
    const d = (offset: number) => {
      const dt = new Date(2026, 0, 1);
      dt.setDate(dt.getDate() + offset);
      return dt;
    };
    matterFindManyMock.mockResolvedValue([
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(10) }, // 10
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(20) }, // 20
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(30) }, // 30
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(40) }, // 40
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(100) } // 100
    ]);
    const r = await getCaseCycleAnalysis(period);
    expect(r).toHaveLength(1);
    expect(r[0].count).toBe(5);
    expect(r[0].avgDays).toBe(40); // (10+20+30+40+100)/5
    expect(r[0].medianDays).toBe(30); // ä¸­é—´
    expect(r[0].minDays).toBe(10);
    expect(r[0].maxDays).toBe(100);
  });

  it("å¶æ•°æ ·æœ¬ï¼šä¸­ä½æ•°å–ä¸¤ä¸­é—´å‡å€¼", async () => {
    const d = (offset: number) => {
      const dt = new Date(2026, 0, 1);
      dt.setDate(dt.getDate() + offset);
      return dt;
    };
    matterFindManyMock.mockResolvedValue([
      { category: "CRIMINAL", createdAt: d(0), closedAt: d(10) },
      { category: "CRIMINAL", createdAt: d(0), closedAt: d(20) },
      { category: "CRIMINAL", createdAt: d(0), closedAt: d(30) },
      { category: "CRIMINAL", createdAt: d(0), closedAt: d(40) }
    ]);
    const r = await getCaseCycleAnalysis(period);
    expect(r[0].medianDays).toBe(25); // (20+30)/2
  });

  it("å¤š category æŒ‰ count å€’åº", async () => {
    const d = (offset: number) => {
      const dt = new Date(2026, 0, 1);
      dt.setDate(dt.getDate() + offset);
      return dt;
    };
    matterFindManyMock.mockResolvedValue([
      { category: "ADMINISTRATIVE", createdAt: d(0), closedAt: d(5) },
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(5) },
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(5) },
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(5) }
    ]);
    const r = await getCaseCycleAnalysis(period);
    expect(r.map((x) => x.category)).toEqual(["CIVIL_COMMERCIAL", "ADMINISTRATIVE"]);
  });

  it("closedAt < createdAt çš„è„æ•°æ®è¢«ä¸¢å¼ƒ", async () => {
    const d = (offset: number) => {
      const dt = new Date(2026, 0, 1);
      dt.setDate(dt.getDate() + offset);
      return dt;
    };
    matterFindManyMock.mockResolvedValue([
      { category: "CIVIL_COMMERCIAL", createdAt: d(10), closedAt: d(5) }, // è„ï¼š-5
      { category: "CIVIL_COMMERCIAL", createdAt: d(0), closedAt: d(10) }
    ]);
    const r = await getCaseCycleAnalysis(period);
    expect(r[0].count).toBe(1);
    expect(r[0].avgDays).toBe(10);
  });
});

describe("getReviewIssueAnalysis", () => {
  it("ç©º â†’ 0 è®¡æ•°", async () => {
    reviewFindManyMock.mockResolvedValue([]);
    const r = await getReviewIssueAnalysis(period);
    expect(r.recordCount).toBe(0);
    expect(r.totalItems).toBe(0);
    expect(r.topIssues).toEqual([]);
    expect(r.bySeverity).toEqual({ HIGH: 0, MEDIUM: 0, LOW: 0 });
  });

  it("èšåˆ severity / type / topIssues", async () => {
    reviewFindManyMock.mockResolvedValue([
      {
        id: "r1",
        documentId: "d1",
        itemsJson: [
          { type: "RISK", severity: "HIGH", title: "è¿çº¦è´£ä»»ç¼ºå¤±", detail: "x" },
          { type: "MISSING", severity: "MEDIUM", title: "ç®¡è¾–çº¦å®šæ¨¡ç³Š", detail: "x" }
        ]
      },
      {
        id: "r2",
        documentId: "d2",
        itemsJson: [
          { type: "RISK", severity: "HIGH", title: "è¿çº¦è´£ä»»ç¼ºå¤±", detail: "x" },
          { type: "RISK", severity: "HIGH", title: "è¿çº¦è´£ä»»ç¼ºå¤±", detail: "x" },
          { type: "SUGGESTION", severity: "LOW", title: "æŽªè¾žå»ºè®®", detail: "x" }
        ]
      },
      {
        id: "r3",
        documentId: "d1", // é‡å¤åŒä¸€ doc
        itemsJson: [
          { type: "RISK", severity: "MEDIUM", title: "è¿çº¦è´£ä»»ç¼ºå¤±", detail: "x" }
        ]
      }
    ]);
    const r = await getReviewIssueAnalysis(period);
    expect(r.recordCount).toBe(3);
    expect(r.documentCount).toBe(2); // d1, d2
    expect(r.totalItems).toBe(6);
    expect(r.bySeverity).toEqual({ HIGH: 3, MEDIUM: 2, LOW: 1 });
    expect(r.byType).toEqual({ MISSING: 1, RISK: 4, ISSUE: 0, SUGGESTION: 1 });
    expect(r.topIssues[0].title).toBe("è¿çº¦è´£ä»»ç¼ºå¤±");
    expect(r.topIssues[0].occurrences).toBe(4);
    expect(r.topIssues[0].severityCounts).toEqual({ HIGH: 3, MEDIUM: 1, LOW: 0 });
  });

  it("topIssues é™ 10 æ¡", async () => {
    reviewFindManyMock.mockResolvedValue([
      {
        id: "r1",
        documentId: "d1",
        itemsJson: Array.from({ length: 15 }, (_, i) => ({
          type: "ISSUE",
          severity: "LOW",
          title: `é—®é¢˜${i}`,
          detail: "x"
        }))
      }
    ]);
    const r = await getReviewIssueAnalysis(period);
    expect(r.topIssues).toHaveLength(10);
  });

  it("ç©º title ä¸è¿› topIssues", async () => {
    reviewFindManyMock.mockResolvedValue([
      {
        id: "r1",
        documentId: "d1",
        itemsJson: [
          { type: "RISK", severity: "HIGH", title: "  ", detail: "x" },
          { type: "RISK", severity: "HIGH", title: "æ­£å¸¸", detail: "x" }
        ]
      }
    ]);
    const r = await getReviewIssueAnalysis(period);
    expect(r.totalItems).toBe(2);
    expect(r.topIssues).toHaveLength(1);
    expect(r.topIssues[0].title).toBe("æ­£å¸¸");
  });
});

