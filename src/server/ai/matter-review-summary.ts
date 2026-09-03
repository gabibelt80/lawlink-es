/**
 * v0.22: Resumen de revisiÃ³n de IA a nivel de caso (agregaciÃ³n de todos los registros de revisiÃ³n del caso)
 *
 * Solo lectura, sin "use server", llamado directamente por server component.
 */
import { getTenantPrisma } from "@/lib/tenant-prisma";
import type {
  ReviewItem,
  ReviewSeverity,
  ReviewType,
} from "@/lib/ai/review-parser";

export type MatterReviewTopItem = {
  title: string;
  type: ReviewType;
  severity: ReviewSeverity;
  detail: string;
  documentId: string;
  documentName: string;
  reviewedAt: Date;
};

export type MatterReviewSummary = {
  recordCount: number;
  documentCount: number;
  totalItems: number;
  bySeverity: Record<ReviewSeverity, number>;
  topHighItems: MatterReviewTopItem[]; // mÃ¡ximo 3
  latestReviewedAt: Date | null;
};

export async function getMatterReviewSummary(
  matterId: string,
): Promise<MatterReviewSummary> {
  const prisma = await getTenantPrisma();
  const records = await prisma.reviewRecord.findMany({
    where: { matterId },
    orderBy: { reviewedAt: "desc" },
    select: {
      id: true,
      reviewedAt: true,
      documentId: true,
      itemsJson: true,
      document: { select: { name: true } },
    },
  });

  const docSet = new Set<string>();
  const bySeverity: Record<ReviewSeverity, number> = {
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };
  let totalItems = 0;
  // Recolecta todos los HIGH, en orden descendente por reviewedAt (los registros ya estÃ¡n en orden), toma los 3 tÃ­tulos distintos mÃ¡s recientes
  const seenTitles = new Set<string>();
  const topHigh: MatterReviewTopItem[] = [];
  let latest: Date | null = null;

  for (const r of records) {
    if (!latest) latest = r.reviewedAt;
    docSet.add(r.documentId);
    const items = (
      Array.isArray(r.itemsJson) ? r.itemsJson : []
    ) as ReviewItem[];
    for (const it of items) {
      totalItems++;
      if (it.severity in bySeverity) bySeverity[it.severity]++;
      if (it.severity === "HIGH" && topHigh.length < 3) {
        const key = it.title.trim();
        if (key && !seenTitles.has(key)) {
          seenTitles.add(key);
          topHigh.push({
            title: it.title,
            type: it.type,
            severity: it.severity,
            detail: it.detail,
            documentId: r.documentId,
            documentName: r.document.name,
            reviewedAt: r.reviewedAt,
          });
        }
      }
    }
  }

  return {
    recordCount: records.length,
    documentCount: docSet.size,
    totalItems,
    bySeverity,
    topHighItems: topHigh,
    latestReviewedAt: latest,
  };
}

