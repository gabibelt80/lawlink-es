/**
 * v0.9.4 å½’æ¡£ä¸“ç”¨æ¸²æŸ“ï¼šå·å®—å°çš® + å·å®—ç›®å½•
 *
 * å¤ç”¨ docxtemplater ç®¡é“ï¼Œä½†æ¯”é€šç”¨ renderTemplate å¤šä¸¤ä»¶äº‹ï¼š
 *   1. æ³¨å…¥ archive.* ä¸Šä¸‹æ–‡ï¼ˆå½’æ¡£å·ã€Cerrar casoæ–¹å¼ã€å½’æ¡£Fechaetc.ï¼‰
 *   2. å·å®—ç›®å½•é¢å¤–æ³¨å…¥ documents[] æ•°ç»„ç”¨äºŽè¡Œå¾ªçŽ¯
 *
 * æ¸²æŸ“äº§ç‰©è½åˆ° ARCHIVE/Cerrar caso/å½’æ¡£ å·å®—ï¼Œcategory=PROCEDUREï¼Œç»‘å®šæ¨¡æ¿ IDï¼ˆç”¨äºŽå®¡è®¡ï¼‰ã€‚
 */
import { Prisma, type PrismaClient, type MatterCategory } from "@prisma/client";
import { storage } from "@/lib/storage";
import { decryptBuffer, encryptBuffer, sha256 } from "@/lib/storage/crypto";
import {
  buildContext,
  renderDocxBuffer,
  type RenderContext,
} from "@/lib/template-engine";
import { suggestFolderByTemplateCategory } from "@/lib/default-folders";
import { CLOSED_REASON_CN } from "./schemas";
import type { ArchiveClosedReason } from "@prisma/client";

const CATEGORY_CN_DOC: Record<string, string> = {
  EVIDENCE: "è¯æ®",
  PLEADING: "è¯‰è®¼æ–‡ä¹¦",
  PROCEDURE: "ç¨‹åºæ–‡ä¹¦",
  JUDGMENT: "è£åˆ¤æ–‡ä¹¦",
  CONTRACT: "åˆåŒ",
  OTHER: "å…¶ä»–",
};

function toCNDate(d: Date): string {
  const cnDigits = "ã€‡ä¸€äºŒä¸‰å››äº”å…­ä¸ƒå…«ä¹";
  const y = String(d.getFullYear())
    .split("")
    .map((c) => cnDigits[+c])
    .join("");
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const cnNum = (n: number) => {
    if (n <= 10)
      return ["ã€‡", "ä¸€", "äºŒ", "ä¸‰", "å››", "äº”", "å…­", "ä¸ƒ", "å…«", "ä¹", "å"][
        n
      ];
    if (n < 20) return "å" + cnDigits[n - 10];
    if (n < 30) return "äºŒå" + (n === 20 ? "" : cnDigits[n - 20]);
    return "ä¸‰å" + (n === 30 ? "" : cnDigits[n - 30]);
  };
  return `${y}å¹´${cnNum(m)}æœˆ${cnNum(day)}æ—¥`;
}

interface ArchiveExtras {
  archiveNo: string;
  closedReason: ArchiveClosedReason;
  completedAt: Date;
  archivedAt: Date;
  judgmentSummary?: string;
}

async function loadBuiltinTemplate(
  prisma: PrismaClient,
  key: "archive_cover" | "archive_catalog",
) {
  // ç”¨ name æ‰¾å†…ç½®æ¨¡æ¿ï¼ˆkey æ²¡å­˜ DBï¼Œname ç”± BUILTIN_TEMPLATES å†³å®šï¼‰
  const nameMap: Record<string, string> = {
    archive_cover: "å·å®—å°çš®",
    archive_catalog: "å·å®—ç›®å½•",
  };
  const tmpl = await prisma.documentTemplate.findFirst({
    where: { name: nameMap[key], isBuiltIn: true, enabled: true },
    include: { docxBlob: true },
  });
  if (!tmpl || !tmpl.docxBlob) {
    throw new Error(
      `Falta la plantilla incorporada ${nameMap[key]}. EjecutÃ¡ npx prisma db seed.`,
    );
  }
  const raw = await storage.readFile(tmpl.docxBlob.path);
  const buffer = tmpl.docxBlob.encrypted
    ? decryptBuffer(raw, tmpl.docxBlob.iv ?? "", tmpl.docxBlob.authTag ?? "")
    : raw;
  return { tmpl, templateBuffer: buffer };
}

async function findOrCreateArchiveFolder(
  prisma: Pick<PrismaClient, "documentFolder">,
  matterId: string,
  matterCategory: MatterCategory,
): Promise<string> {
  const suggestedName =
    suggestFolderByTemplateCategory("ARCHIVE", matterCategory) ?? "å½’æ¡£";
  const existing = await prisma.documentFolder.findFirst({
    where: { matterId, name: suggestedName },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.documentFolder.create({
    data: { matterId, name: suggestedName, isDefault: false, orderIndex: 99 },
  });
  return created.id;
}

/**
 * æ¸²æŸ“å·å®—å°çš® â†’ Volver Document.id
 */
export async function renderArchiveCover(
  prisma: PrismaClient,
  opts: {
    matterId: string;
    userId: string;
    extras: ArchiveExtras;
  },
): Promise<string> {
  const { tmpl, templateBuffer } = await loadBuiltinTemplate(
    prisma,
    "archive_cover",
  );

  const baseCtx = await buildContext({
    matterId: opts.matterId,
    userId: opts.userId,
  });
  const matter = await prisma.matter.findUnique({
    where: { id: opts.matterId },
    select: { internalCode: true, category: true },
  });
  if (!matter) throw new Error("Casoä¸å­˜åœ¨");

  const ctx: RenderContext = {
    ...baseCtx,
    archive: {
      archiveNo: opts.extras.archiveNo,
      closedReasonCN: CLOSED_REASON_CN[opts.extras.closedReason],
      completedAtCN: toCNDate(opts.extras.completedAt),
      archivedAtCN: toCNDate(opts.extras.archivedAt),
      judgmentSummary: opts.extras.judgmentSummary ?? "",
    },
  };

  const buf = renderDocxBuffer(templateBuffer, ctx);
  const enc = encryptBuffer(buf);
  const path = await storage.writeFile(`m_${opts.matterId}`, enc.ciphertext);

  const folderId = await findOrCreateArchiveFolder(
    prisma,
    opts.matterId,
    matter.category,
  );

  const fileName = `å·å®—å°çš®_${opts.extras.archiveNo}.docx`;
  const doc = await prisma.document.create({
    data: {
      matterId: opts.matterId,
      folderId,
      templateId: tmpl.id,
      templateContextSnapshot: ctx as unknown as Prisma.InputJsonValue,
      name: fileName,
      category: "PROCEDURE",
      path,
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: buf.length,
      sha256: sha256(buf),
      encrypted: true,
      algorithm: enc.algorithm,
      iv: enc.iv.toString("base64"),
      authTag: enc.authTag.toString("base64"),
      tags: ["å½’æ¡£", "å·å®—å°çš®", opts.extras.archiveNo],
      uploadedById: opts.userId,
    },
  });
  return doc.id;
}

interface CatalogDocEntry {
  seq: number;
  name: string;
  categoryCN: string;
  uploadDate: string;
  pages: string;
  remark: string;
}

/**
 * æ¸²æŸ“å·å®—ç›®å½• â†’ Volver Document.id
 *
 * documents æ•°ç»„ä»ŽCasoä¸‹æ‰€æœ‰ Document å–ï¼ˆæŒ‰ createdAt å‡åºï¼‰ï¼›
 * æŽ’é™¤è‡ªèº«ï¼ˆå°çš® + ç›®å½•å°šæœªç”Ÿæˆï¼‰+ å·²Eliminarï¼ˆdeletedAtï¼‰ã€‚
 */
export async function renderArchiveCatalog(
  prisma: PrismaClient,
  opts: {
    matterId: string;
    userId: string;
    extras: ArchiveExtras;
    excludeDocIds?: string[]; // é€šå¸¸ä¼ å…¥å°çš® doc id
  },
): Promise<string> {
  const { tmpl, templateBuffer } = await loadBuiltinTemplate(
    prisma,
    "archive_catalog",
  );

  const baseCtx = await buildContext({
    matterId: opts.matterId,
    userId: opts.userId,
  });
  const matter = await prisma.matter.findUnique({
    where: { id: opts.matterId },
    select: { internalCode: true, category: true },
  });
  if (!matter) throw new Error("Casoä¸å­˜åœ¨");

  const docs = await prisma.document.findMany({
    where: {
      matterId: opts.matterId,
      deletedAt: null,
      ...(opts.excludeDocIds && opts.excludeDocIds.length > 0
        ? { id: { notIn: opts.excludeDocIds } }
        : {}),
    },
    select: { id: true, name: true, category: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const entries: CatalogDocEntry[] = docs.map((d, i) => ({
    seq: i + 1,
    name: d.name,
    categoryCN: CATEGORY_CN_DOC[d.category] ?? d.category,
    uploadDate: d.createdAt.toISOString().slice(0, 10),
    pages: "",
    remark: "",
  }));

  const ctx: RenderContext = {
    ...baseCtx,
    archive: {
      archiveNo: opts.extras.archiveNo,
      closedReasonCN: CLOSED_REASON_CN[opts.extras.closedReason],
      completedAtCN: toCNDate(opts.extras.completedAt),
      archivedAtCN: toCNDate(opts.extras.archivedAt),
      judgmentSummary: opts.extras.judgmentSummary ?? "",
    },
    documents: entries,
  };

  const buf = renderDocxBuffer(templateBuffer, ctx);
  const enc = encryptBuffer(buf);
  const path = await storage.writeFile(`m_${opts.matterId}`, enc.ciphertext);

  const folderId = await findOrCreateArchiveFolder(
    prisma,
    opts.matterId,
    matter.category,
  );

  const fileName = `å·å®—ç›®å½•_${opts.extras.archiveNo}.docx`;
  const doc = await prisma.document.create({
    data: {
      matterId: opts.matterId,
      folderId,
      templateId: tmpl.id,
      templateContextSnapshot: ctx as unknown as Prisma.InputJsonValue,
      name: fileName,
      category: "PROCEDURE",
      path,
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: buf.length,
      sha256: sha256(buf),
      encrypted: true,
      algorithm: enc.algorithm,
      iv: enc.iv.toString("base64"),
      authTag: enc.authTag.toString("base64"),
      tags: ["å½’æ¡£", "å·å®—ç›®å½•", opts.extras.archiveNo],
      uploadedById: opts.userId,
    },
  });
  return doc.id;
}


