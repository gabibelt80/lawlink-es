"use server";

/**
 * v0.20: Guardar el resultado de revisión de IA de un documento como Document del caso (modelo simétrico al archivo de casos similares A3)
 */
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { assertCanAccessMatter } from "@/lib/permissions";
import { storage } from "@/lib/storage";
import { sha256 } from "@/lib/storage/crypto";
import { audit } from "@/server/audit";
import type {
  ReviewItem,
  ReviewType,
  ReviewSeverity,
} from "@/lib/ai/review-parser";
import { revalidateMatter } from "@/server/matters/route";

const TYPE_CN: Record<ReviewType, string> = {
  MISSING: "Elementos faltantes",
  RISK: "Riesgo legal",
  ISSUE: "Problemas de cláusulas",
  SUGGESTION: "Sugerencias de mejora",
};

const SEV_CN: Record<ReviewSeverity, string> = {
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Baja",
};

function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "").slice(0, 60);
}

function buildMarkdown(reviewedDocName: string, items: ReviewItem[]): string {
  const now = new Date().toLocaleString("es-AR");
  const lines: string[] = [
    `# Resultado de revisión de IA: ${reviewedDocName}`,
    "",
    `- **Fecha de revisión**: ${now}`,
    `- **Cantidad de hallazgos**: ${items.length}`,
    "",
    "---",
    "",
  ];
  if (items.length === 0) {
    lines.push("> La IA no encontró problemas evidentes.");
    return lines.join("\n");
  }
  // Agrupar por tipo
  const groups: ReviewType[] = ["MISSING", "RISK", "ISSUE", "SUGGESTION"];
  for (const t of groups) {
    const sub = items.filter((i) => i.type === t);
    if (sub.length === 0) continue;
    lines.push(`## ${TYPE_CN[t]} (${sub.length})`, "");
    for (const it of sub) {
      lines.push(`- **${it.title}** \`${SEV_CN[it.severity]}\``);
      lines.push(`  - ${it.detail}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export async function saveReviewToMatter(input: {
  matterId: string;
  reviewedDocId: string;
  reviewedDocName: string;
  items: ReviewItem[];
}): Promise<{ ok: true; documentId: string; documentName: string }> {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  await assertCanAccessMatter(
    session.user.id,
    session.user.role,
    input.matterId,
  );

  const matter = await prisma.matter.findUnique({
    where: { id: input.matterId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!matter) throw new Error("Caso no encontrado");
  if (matter.status === "ARCHIVED") {
    throw new Error("Caso archivado (solo lectura), no se puede guardar el resultado de revisión");
  }

  const md = buildMarkdown(input.reviewedDocName, input.items);
  const buf = Buffer.from(md, "utf-8");
  const path = await storage.writeFile(`m_${input.matterId}`, buf);
  const hash = sha256(buf);
  const ts = new Date().toISOString().slice(0, 10);
  const docName = `RevisionIA_${safeFileName(input.reviewedDocName)}_${ts}.md`;

  const doc = await prisma.document.create({
    data: {
      matterId: input.matterId,
      uploadedById: session.user.id,
      name: docName,
      category: "OTHER",
      path,
      mimeType: "text/markdown",
      size: buf.byteLength,
      sha256: hash,
      encrypted: false,
      tags: ["Revisión IA", "Archivo"],
    },
    select: { id: true, name: true },
  });

  await audit({
    userId: session.user.id,
    action: "AI_REVIEW_SAVE",
    targetType: "Matter",
    targetId: input.matterId,
    detail: {
      reviewedDocId: input.reviewedDocId,
      reviewedDocName: input.reviewedDocName,
      itemCount: input.items.length,
      documentId: doc.id,
    },
  });

  await revalidateMatter(input.matterId);
  return { ok: true, documentId: doc.id, documentName: doc.name };
}