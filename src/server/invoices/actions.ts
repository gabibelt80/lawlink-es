"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { assertMatterWritable } from "@/lib/archive/guard";
import {
  assertCanAccessMatter,
  assertCanAssociateMatter,
  assertCanLeadMatter,
  isManager,
  matterVisibilityFilter
} from "@/lib/permissions";
import { storage } from "@/lib/storage";
import { validateUploadedFile } from "@/lib/storage/file-validator";
import { encryptBuffer, sha256 } from "@/lib/storage/crypto";
import { notifyRoleApprovers } from "@/server/notifications/approval";
import { serializeDecimals } from "@/lib/decimal";
import { revalidateMatter } from "@/server/matters/route";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function requireFinanceOrApprover(role: string) {
  if (role !== "FINANCE" && role !== "ADMIN" && role !== "PRINCIPAL_LAWYER") {
    throw new Error("ä»…Finanzas / Administrarå‘˜ / ä¸»ä»»Abogadoå¯å¤„ç†å¼€ç¥¨");
  }
}

function canReviewInvoiceRequests(role: string) {
  return isManager(role) || role === "FINANCE";
}

function invoiceRequestVisibilityWhere(
  userId: string,
  role: string
): Prisma.InvoiceRequestWhereInput {
  if (canReviewInvoiceRequests(role)) return {};
  return {
    OR: [
      { requestedById: userId },
      {
        matter: {
          deletedAt: null,
          ...matterVisibilityFilter(userId, role)
        }
      }
    ]
  };
}

/** Abogadoåœ¨Casoè¯¦æƒ…Enviarå¼€ç¥¨ç”³è¯· */
const createSchema = z.object({
  matterId: z.string().cuid(),
  amount: z.coerce.number().positive("Montoéœ€å¤§äºŽ 0"),
  title: z.string().max(120).optional().or(z.literal("")),
  requestNote: z.string().max(500).optional().or(z.literal(""))
});

export async function createInvoiceRequest(input: z.infer<typeof createSchema>) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const data = createSchema.parse(input);
  await assertCanAssociateMatter(session.user.id, data.matterId);
  await assertMatterWritable(data.matterId);

  await assertCanLeadMatter(session.user.id, data.matterId, "ä»…Casoä¸»åŠž/ååŠžAbogadoå¯ç”³è¯·å¼€ç¥¨");

  const created = await prisma.invoiceRequest.create({
    data: {
      matterId: data.matterId,
      amount: data.amount,
      title: data.title?.trim() || null,
      requestNote: data.requestNote?.trim() || null,
      requestedById: session.user.id,
      status: "PENDING"
    }
  });

  await audit({
    userId: session.user.id,
    action: "INVOICE_REQUEST_CREATE",
    targetType: "InvoiceRequest",
    targetId: created.id,
    detail: { matterId: data.matterId, amount: data.amount }
  });

  const matter = await prisma.matter.findUnique({
    where: { id: data.matterId },
    select: { internalCode: true, title: true }
  });

  await notifyRoleApprovers({
    roles: ["ADMIN", "PRINCIPAL_LAWYER", "FINANCE"],
    excludeUserId: session.user.id,
    title: "æ–°çš„FacturaAprobaciÃ³nå¾…å¤„ç†",
    content: `${session.user.name ?? "æœ‰ç”¨æˆ·"} Enviaräº†å¼€ç¥¨ç”³è¯·ï¼š${
      matter ? `${matter.internalCode} ${matter.title}` : "å…³è”Caso"
    }ï¼ŒMonto ${data.amount.toLocaleString("zh-CN")} pesos`,
    href: "/finance",
    refType: "InvoiceRequest",
    refId: created.id,
    priority: "HIGH"
  });

  await revalidateMatter(data.matterId);
  revalidatePath("/finance");
  return { ok: true, id: created.id };
}

export async function listInvoiceRequests(filter?: { status?: "PENDING" | "ISSUED" | "REJECTED" | "APPROVED" }) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const where: Prisma.InvoiceRequestWhereInput = {
    ...invoiceRequestVisibilityWhere(session.user.id, session.user.role),
    ...(filter?.status ? { status: filter.status } : {})
  };
  const rows = await prisma.invoiceRequest.findMany({
    where,
    orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
    include: {
      matter: { select: { id: true, internalCode: true, title: true } },
      requestedBy: { select: { id: true, name: true } },
      processedBy: { select: { id: true, name: true } },
      contractScan: { select: { id: true, name: true } },
      invoiceFile: { select: { id: true, name: true } }
    }
  });

  const evidenceIds = Array.from(new Set(rows.flatMap((row) => row.evidenceDocIds)));
  const docs = evidenceIds.length
    ? await prisma.document.findMany({
        where: { id: { in: evidenceIds }, deletedAt: null },
        select: { id: true, name: true, size: true, mimeType: true, createdAt: true }
      })
    : [];
  const docMap = new Map(docs.map((doc) => [doc.id, doc]));

  return rows.map((row) => ({
    ...row,
    amount: Number(row.amount),
    evidenceDocs: row.evidenceDocIds
      .map((id) => docMap.get(id))
      .filter((doc): doc is (typeof docs)[number] => Boolean(doc))
  }));
}

export async function listInvoiceRequestsByMatter(matterId: string) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  await assertCanAccessMatter(session.user.id, session.user.role, matterId);
  const rows = await prisma.invoiceRequest.findMany({
    where: { matterId },
    orderBy: { requestedAt: "desc" },
    include: {
      requestedBy: { select: { id: true, name: true } },
      processedBy: { select: { id: true, name: true } },
      contractScan: { select: { id: true, name: true } },
      invoiceFile: { select: { id: true, name: true } }
    }
  });
  return serializeDecimals(rows);
}

/**
 * Finanzasæ‰¹å‡† + ä¸Šä¼ ç”µå­Facturaã€‚FormDataï¼š
 *   requestId, processNote?, contractScan(File?), invoiceFile(File?)
 * - ä¸ä¼  invoiceFileï¼šEstado APPROVED
 * - ä¼  invoiceFileï¼šEstado ISSUED
 *
 * contractScan ä»…ä¿ç•™å…¼å®¹æ—§æ•°æ®æµï¼›ç”³è¯·ä¾æ®åº”ç”±ç”³è¯·äººä¸Šä¼ åˆ° evidenceDocIdsã€‚
 */
export async function approveInvoiceRequest(formData: FormData) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  requireFinanceOrApprover(session.user.role);

  const requestId = formData.get("requestId");
  if (typeof requestId !== "string" || !requestId) throw new Error("requestId ç¼ºå¤±");

  const existing = await prisma.invoiceRequest.findUnique({
    where: { id: requestId },
    select: { id: true, matterId: true, status: true }
  });
  if (!existing) throw new Error("ç”³è¯·ä¸å­˜åœ¨");
  if (existing.status === "ISSUED") throw new Error("æ­¤ç”³è¯·å·²å¼€å…·");
  if (existing.status === "REJECTED") throw new Error("æ­¤ç”³è¯·Rechazado");

  const processNote = formData.get("processNote");
  const contractScan = formData.get("contractScan");
  const invoiceFile = formData.get("invoiceFile");
  // v0.14: çœŸå®žFacturaå·ï¼ˆFinanzasæ‰¹å‡†/å¼€å…·æ—¶å›žå¡«ï¼‰
  const invoiceNo = formData.get("invoiceNo");

  let contractScanDocId: string | undefined;
  let invoiceFileDocId: string | undefined;

  // å…¼å®¹æ—§æµç¨‹ï¼šåŽ†å²ä¸Šå…è®¸Finanzasè¡¥ä¼ æ‰«æä»¶åˆåŒï¼›æ–°æµç¨‹ç”±ç”³è¯·äººä¸Šä¼  evidenceDocIdsã€‚
  if (contractScan instanceof File && contractScan.size > 0) {
    validateUploadedFile(contractScan, { purpose: "invoice", maxBytes: MAX_FILE_SIZE });
    const raw = Buffer.from(await contractScan.arrayBuffer());
    const enc = encryptBuffer(raw);
    const path = await storage.writeFile(storageScope(existing.matterId, requestId), enc.ciphertext);
    const doc = await prisma.document.create({
      data: {
        matterId: existing.matterId,
        name: contractScan.name,
        category: "CONTRACT",
        path,
        mimeType: contractScan.type || "application/octet-stream",
        size: contractScan.size,
        sha256: sha256(raw),
        encrypted: true,
        algorithm: enc.algorithm,
        iv: enc.iv.toString("base64"),
        authTag: enc.authTag.toString("base64"),
        tags: ["Facturaç”³è¯·"],
        uploadedById: session.user.id
      }
    });
    contractScanDocId = doc.id;
  }

  // ä¸Šä¼ ç”µå­Factura
  if (invoiceFile instanceof File && invoiceFile.size > 0) {
    validateUploadedFile(invoiceFile, { purpose: "invoice", maxBytes: MAX_FILE_SIZE });
    const raw = Buffer.from(await invoiceFile.arrayBuffer());
    const enc = encryptBuffer(raw);
    const path = await storage.writeFile(storageScope(existing.matterId, requestId), enc.ciphertext);
    const doc = await prisma.document.create({
      data: {
        matterId: existing.matterId,
        name: invoiceFile.name,
        category: "OTHER",
        path,
        mimeType: invoiceFile.type || "application/octet-stream",
        size: invoiceFile.size,
        sha256: sha256(raw),
        encrypted: true,
        algorithm: enc.algorithm,
        iv: enc.iv.toString("base64"),
        authTag: enc.authTag.toString("base64"),
        tags: ["ç”µå­Factura"],
        uploadedById: session.user.id
      }
    });
    invoiceFileDocId = doc.id;
  }

  const finalStatus = invoiceFileDocId
    ? ("ISSUED" as const)
    : contractScanDocId
      ? ("APPROVED" as const)
      : ("APPROVED" as const);

  const invoiceNoStr =
    typeof invoiceNo === "string" && invoiceNo.trim() ? invoiceNo.trim() : null;

  await prisma.invoiceRequest.update({
    where: { id: requestId },
    data: {
      status: finalStatus,
      processNote: typeof processNote === "string" ? processNote.trim() || null : null,
      processedById: session.user.id,
      processedAt: new Date(),
      ...(contractScanDocId ? { contractScanId: contractScanDocId } : {}),
      ...(invoiceFileDocId ? { invoiceFileId: invoiceFileDocId } : {}),
      // v0.14: å¼€ç¥¨å®Œæˆï¼ˆISSUEDï¼‰æ—¶å›žå¡«çœŸå®žFacturaå· + æ—¶é—´
      ...(finalStatus === "ISSUED" && invoiceNoStr
        ? { invoiceNo: invoiceNoStr, issuedAt: new Date() }
        : {})
    }
  });

  await audit({
    userId: session.user.id,
    action: finalStatus === "ISSUED" ? "INVOICE_ISSUED" : "INVOICE_APPROVED",
    targetType: "InvoiceRequest",
    targetId: requestId,
    detail: {
      matterId: existing.matterId,
      hasContract: !!contractScanDocId,
      hasInvoice: !!invoiceFileDocId
    }
  });

  if (existing.matterId) await revalidateMatter(existing.matterId);
  revalidatePath("/finance");
  return { ok: true, status: finalStatus };
}

function storageScope(matterId: string | null, requestId: string) {
  return matterId ? `m_${matterId}` : `invoice_${requestId}`;
}

const rejectSchema = z.object({
  requestId: z.string().cuid(),
  reason: z.string().min(1, "è¯·è¯´æ˜ŽRechazarMotivo").max(500)
});

export async function rejectInvoiceRequest(input: z.infer<typeof rejectSchema>) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  requireFinanceOrApprover(session.user.role);
  const data = rejectSchema.parse(input);

  const existing = await prisma.invoiceRequest.findUnique({
    where: { id: data.requestId },
    select: { matterId: true, status: true }
  });
  if (!existing) throw new Error("ç”³è¯·ä¸å­˜åœ¨");
  if (existing.status === "ISSUED") throw new Error("å·²å¼€å…·çš„ç”³è¯·ä¸å¯Rechazar");

  await prisma.invoiceRequest.update({
    where: { id: data.requestId },
    data: {
      status: "REJECTED",
      processNote: data.reason,
      processedById: session.user.id,
      processedAt: new Date()
    }
  });

  await audit({
    userId: session.user.id,
    action: "INVOICE_REJECTED",
    targetType: "InvoiceRequest",
    targetId: data.requestId,
    detail: { matterId: existing.matterId, reason: data.reason }
  });

  if (existing.matterId) await revalidateMatter(existing.matterId);
  revalidatePath("/finance");
  return { ok: true };
}

/** Finanzasé¡µ KPIï¼šæœ¬æœˆå·²å¼€ç¥¨åˆè®¡ */
export async function getInvoiceStats() {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const visibilityWhere = invoiceRequestVisibilityWhere(session.user.id, session.user.role);
  const issued = await prisma.invoiceRequest.aggregate({
    where: {
      ...visibilityWhere,
      status: "ISSUED",
      processedAt: { gte: monthStart }
    },
    _sum: { amount: true },
    _count: true
  });
  const pendingCount = await prisma.invoiceRequest.count({
    where: {
      ...visibilityWhere,
      status: "PENDING"
    }
  });
  return {
    monthlyIssued: Number(issued._sum.amount ?? 0),
    monthlyIssuedCount: issued._count,
    pendingCount
  };
}


