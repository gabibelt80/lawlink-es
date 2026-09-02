"use server";

/**
 * v0.19: Revisión inteligente de documentos
 *
 * Lee el documento desde el almacenamiento → extrae texto (PDF/DOCX/texto plano) → lo envía a la IA → lista de revisión estructurada.
 * Actualmente cubre documentos generales (contratos, demandas, solicitudes, acuerdos, pruebas documentales, etc.), sin distinguir tipo de documento, usa el mismo prompt.
 */
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { assertCanAccessMatter } from "@/lib/permissions";
import { storage } from "@/lib/storage";
import { decryptBuffer } from "@/lib/storage/crypto";
import { aiChat, AiNotConfiguredError } from "@/lib/ai/client";
import { parseReviewItems, type ReviewItem } from "@/lib/ai/review-parser";
import { selectReviewPrompt, reviewPromptLabel } from "@/lib/ai/review-prompts";
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";

export type ReviewResult = {
  documentName: string;
  textPreviewChars: number;
  truncated: boolean;
  items: ReviewItem[];
  /** v0.21: ReviewRecord.id después de guardar en la base; null si el documento no pertenece a un Matter (por ejemplo, en etapa de admisión) */
  recordId: string | null;
};

// v0.26: el prompt se selecciona según Document.category (src/lib/ai/review-prompts.ts)

const MAX_CHARS_FOR_AI = 6000;

async function extractDocumentText(
  buf: Buffer,
  mimeType: string | null,
): Promise<string> {
  const mt = (mimeType ?? "").toLowerCase();
  if (mt === "application/pdf") {
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : text;
  }
  if (
    mt ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mt === "application/docx"
  ) {
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return value;
  }
  if (mt === "application/msword") {
    throw new Error(
      "No se admite el formato .doc antiguo; guardá el archivo como .docx y volvelo a subir",
    );
  }
  if (mt.startsWith("text/")) {
    return buf.toString("utf8");
  }
  throw new Error(
    `Tipo de documento no compatible (${mimeType ?? "desconocido"}), actualmente solo se admiten PDF / DOCX / texto plano`,
  );
}

export async function reviewDocument(input: {
  documentId: string;
}): Promise<ReviewResult> {
  const session = await requireSession();
  const prisma = await getTenantPrisma();

  const doc = await prisma.document.findFirst({
    where: { id: input.documentId, deletedAt: null },
  });
  if (!doc) throw new Error("El material no existe");

  if (doc.matterId) {
    await assertCanAccessMatter(
      session.user.id,
      session.user.role,
      doc.matterId,
    );
  }

  // Lectura + descifrado
  const stored = await storage.readFile(doc.path);
  let buf: Buffer;
  if (doc.encrypted) {
    if (!doc.iv || !doc.authTag)
      throw new Error("Los metadatos cifrados están dañados");
    buf = decryptBuffer(stored, doc.iv, doc.authTag);
  } else {
    buf = stored;
  }

  const raw = (await extractDocumentText(buf, doc.mimeType)).trim();
  if (raw.length < 20) {
    throw new Error(
      "No hay texto analizable (puede ser un PDF escaneado o un documento vacío). Usá un PDF con capa de texto o un DOCX",
    );
  }

  const truncated = raw.length > MAX_CHARS_FOR_AI;
  const text = truncated ? raw.slice(0, MAX_CHARS_FOR_AI) : raw;

  // v0.26: Seleccionar prompt según Document.category (contrato/demanda/prueba/sentencia 4 conjuntos especializados + genérico)
  const systemPrompt = selectReviewPrompt(doc.category);
  const promptLabel = reviewPromptLabel(doc.category);

  let content = "";
  try {
    const res = await aiChat({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Nombre del documento: ${doc.name}\nTipo de revisión: ${promptLabel}\n\nTexto del documento:\n${text}${truncated ? "\n\n(Nota: el texto original es largo, se truncó la primera parte para la revisión)" : ""}`,
        },
      ],
      maxTokens: 2000,
      temperature: 0.2,
      timeoutMs: 45_000,
    });
    content = res.content;
  } catch (err) {
    if (err instanceof AiNotConfiguredError) throw err;
    throw new Error(err instanceof Error ? err.message : "Error en la solicitud de revisión de IA");
  }

  const items = parseReviewItems(content);

  // v0.21: Guardar historial (solo si el documento pertenece a un Matter)
  let recordId: string | null = null;
  if (doc.matterId) {
    const rec = await prisma.reviewRecord.create({
      data: {
        matterId: doc.matterId,
        documentId: doc.id,
        reviewedById: session.user.id,
        itemCount: items.length,
        itemsJson: items as unknown as object,
        textPreviewChars: text.length,
        truncated,
      },
      select: { id: true },
    });
    recordId = rec.id;
  }

  return {
    documentName: doc.name,
    textPreviewChars: text.length,
    truncated,
    items,
    recordId,
  };
}