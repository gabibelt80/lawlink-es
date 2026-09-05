/**
 * v0.22: æŠ¥è¡¨æ·±å…¥åˆ†æž
 *
 * - åŠžæ¡ˆå‘¨æœŸï¼šæœ¬æœŸå·²ç»“Casoçš„ closedAt - createdAt dÃ­asæ•°ï¼ŒæŒ‰ category ç»Ÿè®¡
 * - AI å®¡æŸ¥ top issuesï¼šæœ¬æœŸ ReviewRecord.itemsJson èšåˆï¼Œæ‰¾é«˜é¢‘ title
 */
import { prisma } from "@/lib/prisma";
import type { MatterCategory } from "@prisma/client";
import type { ReportPeriod } from "./queries";
import type { ReviewItem, ReviewType, ReviewSeverity } from "@/lib/ai/review-parser";

export type CycleStats = {
  category: MatterCategory;
  count: number;
  avgDays: number;
  medianDays: number;
  minDays: number;
  maxDays: number;
};

/**
 * è®¡ç®—"æ”¶æ¡ˆâ†’Cerrar caso"å‘¨æœŸã€‚æœ¬æœŸ closedAt è½å…¥çš„Casoä¸ºå£å¾„ã€‚
 * ç”¨ JS ç«¯æŽ’åºç®—ä¸­ä½æ•°ï¼ˆprisma groupBy ä¸æ”¯æŒä¸­ä½æ•°ï¼‰ã€‚
 */
export async function getCaseCycleAnalysis(period: ReportPeriod): Promise<CycleStats[]> {
  const closed = await prisma.matter.findMany({
    where: {
      closedAt: { gte: period.start, lt: period.end },
      deletedAt: null,
      createdAt: { lt: period.end } // é˜²å¾¡æ€§ï¼šcreatedAt åº”å½“ <= closedAt
    },
    select: { category: true, createdAt: true, closedAt: true }
  });

  // æŒ‰ category èšåˆ days æ•°ç»„
  const byCat = new Map<MatterCategory, number[]>();
  for (const m of closed) {
    if (!m.closedAt) continue;
    const days = Math.round((m.closedAt.getTime() - m.createdAt.getTime()) / 86400_000);
    if (days < 0) continue;
    if (!byCat.has(m.category)) byCat.set(m.category, []);
    byCat.get(m.category)!.push(days);
  }

  const out: CycleStats[] = [];
  for (const [cat, arr] of byCat) {
    arr.sort((a, b) => a - b);
    const sum = arr.reduce((s, v) => s + v, 0);
    const avg = arr.length > 0 ? sum / arr.length : 0;
    const median =
      arr.length === 0
        ? 0
        : arr.length % 2 === 1
          ? arr[(arr.length - 1) / 2]
          : (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2;
    out.push({
      category: cat,
      count: arr.length,
      avgDays: Math.round(avg * 10) / 10,
      medianDays: Math.round(median * 10) / 10,
      minDays: arr[0],
      maxDays: arr[arr.length - 1]
    });
  }
  return out.sort((a, b) => b.count - a.count);
}

export type ReviewTopIssue = {
  title: string;
  type: ReviewType;
  occurrences: number;
  severityCounts: Record<ReviewSeverity, number>;
};

export type ReviewIssueAnalysis = {
  recordCount: number;
  documentCount: number;
  totalItems: number;
  bySeverity: Record<ReviewSeverity, number>;
  byType: Record<ReviewType, number>;
  topIssues: ReviewTopIssue[]; // å‡ºçŽ°é¢‘çŽ‡ top 10 çš„ title
};

/**
 * æœ¬æœŸ AI å®¡æŸ¥çš„è·¨Casoèšåˆç»Ÿè®¡ã€‚
 * ä»Ž ReviewRecord.itemsJson æ‹‰å‡ºæ¥ JS èšåˆï¼ˆPG jsonb å‡½æ•°è·¯å¾„ prisma ä¸å‹å¥½ï¼‰ã€‚
 */
export async function getReviewIssueAnalysis(period: ReportPeriod): Promise<ReviewIssueAnalysis> {
  const records = await prisma.reviewRecord.findMany({
    where: { reviewedAt: { gte: period.start, lt: period.end } },
    select: { id: true, documentId: true, itemsJson: true }
  });

  const docSet = new Set<string>();
  const bySev: Record<ReviewSeverity, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  const byType: Record<ReviewType, number> = {
    MISSING: 0,
    RISK: 0,
    ISSUE: 0,
    SUGGESTION: 0
  };
  // title â†’ ç´¯åŠ 
  const titleMap = new Map<
    string,
    { type: ReviewType; occurrences: number; severityCounts: Record<ReviewSeverity, number> }
  >();
  let totalItems = 0;

  for (const r of records) {
    docSet.add(r.documentId);
    const items = (Array.isArray(r.itemsJson) ? r.itemsJson : []) as ReviewItem[];
    for (const it of items) {
      totalItems++;
      if (it.severity in bySev) bySev[it.severity]++;
      if (it.type in byType) byType[it.type]++;
      const key = it.title.trim();
      if (!key) continue;
      if (!titleMap.has(key)) {
        titleMap.set(key, {
          type: it.type,
          occurrences: 0,
          severityCounts: { HIGH: 0, MEDIUM: 0, LOW: 0 }
        });
      }
      const entry = titleMap.get(key)!;
      entry.occurrences++;
      if (it.severity in entry.severityCounts) entry.severityCounts[it.severity]++;
    }
  }

  const topIssues: ReviewTopIssue[] = Array.from(titleMap.entries())
    .map(([title, v]) => ({
      title,
      type: v.type,
      occurrences: v.occurrences,
      severityCounts: v.severityCounts
    }))
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 10);

  return {
    recordCount: records.length,
    documentCount: docSet.size,
    totalItems,
    bySeverity: bySev,
    byType,
    topIssues
  };
}


