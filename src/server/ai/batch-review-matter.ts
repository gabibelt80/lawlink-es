"use server";

/**
 * v0.22: Escaneo con un clic de todos los documentos no revisados del caso
 *
 * - Obtiene documentos del caso con mime soportado (PDF / DOCX / text) que no hayan sido revisados en los últimos 7 días
 * - Límite máximo de 5 documentos por lote (para evitar agotar tokens)
 * - Llama a reviewDocument en bucle; un error individual no detiene el proceso
 * - Devuelve { reviewed, skipped, errors[] }
 */
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { assertCanAccessMatter } from "@/lib/permissions";
import { audit } from "@/server/audit";
import { reviewDocument } from "./review-document";
import { revalidateMatter } from "@/server/matters/route";

const MAX_DOCS_PER_BATCH = 5;
const RECENT_HOURS = 24 * 7;

const REVIEWABLE_MIMES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/docx",
]);
function isReviewable(mime: string | null | undefined): boolean {
  if (!mime) return false;
  if (REVIEWABLE_MIMES.has(mime)) return true;
  return mime.startsWith("text/");
}

export type BatchReviewSummary = {
  reviewed: { documentId: string; documentName: string; itemCount: number }[];
  skipped: { documentId: string; documentName: string; reason: string }[];
  errors: { documentId: string; documentName: string; error: string }[];
  matterId: string;
};

export async function batchReviewMatterDocuments(input: {
  matterId: string;
}): Promise<BatchReviewSummary> {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  await assertCanAccessMatter(
    session.user.id,
    session.user.role,
    input.matterId,
  );

  // Obtener documentos del caso que sean revisables
  const docs = await prisma.document.findMany({
    where: { matterId: input.matterId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, mimeType: true, createdAt: true },
  });
  const reviewable = docs.filter((d) => isReviewable(d.mimeType));

  // Obtener el conjunto de documentId ya revisados en los últimos 7 días
  const cutoff = new Date(Date.now() - RECENT_HOURS * 3600_000);
  const recent = await prisma.reviewRecord.findMany({
    where: {
      matterId: input.matterId,
      reviewedAt: { gte: cutoff },
      documentId: { in: reviewable.map((d) => d.id) },
    },
    select: { documentId: true },
  });
  const recentSet = new Set(recent.map((r) => r.documentId));

  const skipped: BatchReviewSummary["skipped"] = [];
  const todo: typeof reviewable = [];
  for (const d of docs) {
    if (!isReviewable(d.mimeType)) {
      skipped.push({
        documentId: d.id,
        documentName: d.name,
        reason: `Formato no compatible: ${d.mimeType ?? "desconocido"}`,
      });
      continue;
    }
    if (recentSet.has(d.id)) {
      skipped.push({
        documentId: d.id,
        documentName: d.name,
        reason: "Revisado en los últimos 7 días",
      });
      continue;
    }
    todo.push(d);
  }

  const truncated = todo.length > MAX_DOCS_PER_BATCH;
  const batch = todo.slice(0, MAX_DOCS_PER_BATCH);
  if (truncated) {
    for (const d of todo.slice(MAX_DOCS_PER_BATCH)) {
      skipped.push({
        documentId: d.id,
        documentName: d.name,
        reason: `Se omitió esta vez (máximo ${MAX_DOCS_PER_BATCH} por lote, podés volver a escanear)`,
      });
    }
  }

  const reviewed: BatchReviewSummary["reviewed"] = [];
  const errors: BatchReviewSummary["errors"] = [];
  for (const d of batch) {
    try {
      const r = await reviewDocument({ documentId: d.id });
      reviewed.push({
        documentId: d.id,
        documentName: d.name,
        itemCount: r.items.length,
      });
    } catch (err) {
      errors.push({
        documentId: d.id,
        documentName: d.name,
        error: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  await audit({
    userId: session.user.id,
    action: "AI_BATCH_REVIEW_MATTER",
    targetType: "Matter",
    targetId: input.matterId,
    detail: {
      reviewed: reviewed.length,
      skipped: skipped.length,
      errors: errors.length,
      totalReviewable: reviewable.length,
      limit: MAX_DOCS_PER_BATCH,
    },
  });

  await revalidateMatter(input.matterId);

  return {
    matterId: input.matterId,
    reviewed,
    skipped,
    errors,
  };
}