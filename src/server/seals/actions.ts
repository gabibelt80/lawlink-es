"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, type SealType, type UserRole } from "@prisma/client";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { createNotification } from "@/server/notifications/create";
import { notifyDirectApprovers } from "@/server/notifications/approval";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanAssociateMatter } from "@/lib/permissions";
import { storage } from "@/lib/storage";
import { validateUploadedFile } from "@/lib/storage/file-validator";
import { decryptBuffer, encryptBuffer, sha256 } from "@/lib/storage/crypto";
import { normalizeUploadedFilename } from "@/lib/filename";
import {
  sealCreateSchema,
  sealApproveSchema,
  sealRejectSchema,
  sealCancelSchema,
  sealListFilterSchema
} from "./schemas";
import { revalidateMatter } from "@/server/matters/route";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const FIRM_LEGAL_REP_KEY = "firmLegalRepUserId";

function assertPdfDocument(file: { name?: string | null; type?: string | null; mimeType?: string | null }) {
  const type = file.type ?? file.mimeType ?? "";
  const name = file.name ?? "";
  if (type !== "application/pdf" && !name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Debe subir un archivo en formato PDF");
  }
}

// Número de secuencia SEAL-YYYY-NNNN
async function generateSealCode(): Promise<string> {
  const year = new Date().getFullYear();
  const key = `seal-counter-${year}`;
  const next = await prisma.$transaction(
    async (tx) => {
      const existing = await tx.systemSetting.findUnique({ where: { key } });
      const current = (existing?.value as { value?: number })?.value ?? 0;
      const incremented = current + 1;
      await tx.systemSetting.upsert({
        where: { key },
        update: { value: { value: incremented } },
        create: { key, value: { value: incremented } }
      });
      return incremented;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
  return `SEAL-${year}-${String(next).padStart(4, "0")}`;
}

// Permisos - Quién puede aprobar cada tipo de sello
async function getFirmLegalRepUserId(): Promise<string | null> {
  const s = await prisma.systemSetting.findUnique({ where: { key: FIRM_LEGAL_REP_KEY } });
  const v = (s?.value as { value?: string })?.value;
  return typeof v === "string" && v.length > 0 ? v : null;
}

async function canApproveSealType(
  sealType: SealType,
  user: { id: string; role: string }
): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  const cfg = await prisma.sealTypeConfig.findUnique({ where: { type: sealType } });
  if (!cfg || !cfg.enabled) return false;
  if (cfg.requiresLegalRep) {
    const repId = await getFirmLegalRepUserId();
    return !!repId && repId === user.id;
  }
  return cfg.approverRoles.includes(user.role as UserRole);
}

// Listado
export async function listSealRequests(input?: z.input<typeof sealListFilterSchema>) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const filter = sealListFilterSchema.parse(input ?? {});
  const where: Prisma.SealRequestWhereInput = {};

  if (filter.status) where.status = filter.status;
  if (filter.sealType) where.sealType = filter.sealType;

  if (filter.scope === "mine") {
    where.requestedById = session.user.id;
  } else if (filter.scope === "approval") {
    const approvableTypes = await pickApprovableSealTypes(session.user);
    if (approvableTypes.length === 0) {
      return [];
    }
    where.sealType = { in: approvableTypes };
    where.status = "PENDING";
  } else {
    if (session.user.role === "FINANCE") {
      where.sealType = "FINANCE_SEAL";
    } else if (session.user.role === "LAWYER" || session.user.role === "ASSISTANT") {
      where.requestedById = session.user.id;
    }
  }

  return prisma.sealRequest.findMany({
    where,
    orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
    include: {
      matter: { select: { id: true, internalCode: true, title: true } },
      requestedBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      stampedByUser: { select: { id: true, name: true } },
      draftDoc: { select: { id: true, name: true, size: true } },
      stampedDoc: { select: { id: true, name: true, size: true } }
    }
  });
}

async function pickApprovableSealTypes(user: { id: string; role: string }): Promise<SealType[]> {
  if (user.role === "ADMIN") {
    return ["OFFICIAL_SEAL", "CONTRACT_SEAL", "FINANCE_SEAL", "LEGAL_REP_SEAL", "CONTRACT_REVIEW_SEAL"];
  }
  const cfgs = await prisma.sealTypeConfig.findMany({ where: { enabled: true } });
  const repId = await getFirmLegalRepUserId();
  return cfgs
    .filter((c) => {
      if (c.requiresLegalRep) return !!repId && repId === user.id;
      return c.approverRoles.includes(user.role as UserRole);
    })
    .map((c) => c.type);
}

async function getSealApprovalRecipientIds(sealType: SealType): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { active: true, role: "ADMIN" },
    select: { id: true }
  });
  const ids = admins.map((user) => user.id);

  const cfg = await prisma.sealTypeConfig.findUnique({ where: { type: sealType } });
  if (!cfg || !cfg.enabled) return ids;

  if (cfg.requiresLegalRep) {
    const repId = await getFirmLegalRepUserId();
    if (repId) ids.push(repId);
    return ids;
  }

  if (cfg.approverRoles.length > 0) {
    const roleApprovers = await prisma.user.findMany({
      where: {
        active: true,
        role: { in: cfg.approverRoles as UserRole[] }
      },
      select: { id: true }
    });
    ids.push(...roleApprovers.map((user) => user.id));
  }

  return ids;
}

async function notifySealApprovalRequested(input: {
  sealRequestId: string;
  code: string;
  sealType: SealType;
  documentTitle: string;
  purpose: string;
  requesterId: string;
  requesterName?: string | null;
  urgency: "NORMAL" | "URGENT";
}) {
  const userIds = await getSealApprovalRecipientIds(input.sealType);
  await notifyDirectApprovers({
    userIds,
    excludeUserId: input.requesterId,
    title: "Nueva solicitud de sello pendiente de aprobación",
    content: `${input.requesterName ?? "Un usuario"} envió una solicitud de sello: ${input.code} · ${input.documentTitle} · ${input.purpose}`,
    href: `/approvals/seals?id=${input.sealRequestId}`,
    refType: "SealRequest",
    refId: input.sealRequestId,
    priority: input.urgency === "URGENT" ? "URGENT" : "HIGH"
  });
}

export async function getSealApprovalCapabilities() {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const approvableTypes = await pickApprovableSealTypes(session.user);
  return {
    canApprove: approvableTypes.length > 0,
    canViewFirmQueue:
      session.user.role === "ADMIN" ||
      session.user.role === "PRINCIPAL_LAWYER" ||
      session.user.role === "FINANCE"
  };
}

export async function getSealRequest(id: string) {
  const prisma = await getTenantPrisma();
  await requireSession();
  return prisma.sealRequest.findUnique({
    where: { id },
    include: {
      matter: { select: { id: true, internalCode: true, title: true } },
      requestedBy: { select: { id: true, name: true, role: true } },
      approvedBy: { select: { id: true, name: true } },
      stampedByUser: { select: { id: true, name: true } },
      draftDoc: { select: { id: true, name: true, size: true, mimeType: true } },
      stampedDoc: { select: { id: true, name: true, size: true, mimeType: true } },
      parentSealRequest: { select: { id: true, code: true, status: true } }
    }
  });
}

export async function listSealTypeConfigs() {
  const prisma = await getTenantPrisma();
  await requireSession();
  return prisma.sealTypeConfig.findMany({ orderBy: { type: "asc" } });
}

export async function getSealStats() {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthStampedScope: Prisma.SealRequestWhereInput =
    session.user.role === "FINANCE"
      ? { status: "STAMPED", stampedAt: { gte: monthStart }, sealType: "FINANCE_SEAL" }
      : { status: "STAMPED", stampedAt: { gte: monthStart } };

  const approvableTypes = await pickApprovableSealTypes(session.user);

  const [monthStamped, pendingApprovalCount, waitingStampCount] = await Promise.all([
    prisma.sealRequest.count({ where: monthStampedScope }),
    approvableTypes.length > 0
      ? prisma.sealRequest.count({
          where: { status: "PENDING", sealType: { in: approvableTypes } }
        })
      : 0,
    prisma.sealRequest.count({ where: { status: "APPROVED" } })
  ]);

  return {
    monthStamped,
    pendingApprovalCount,
    waitingStampCount
  };
}

// Nueva solicitud - FormData (incluye archivo draftDoc)
export async function createSealRequest(formData: FormData) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
if (!session.user.id) {
    throw new Error("Usuario no válido");
}

  const raw = {
    sealType: formData.get("sealType"),
    matterId: formData.get("matterId") || null,
    purpose: formData.get("purpose"),
    documentTitle: formData.get("documentTitle"),
    pageCount: formData.get("pageCount") ?? "1",
    requireCrossPageSeal: formData.get("requireCrossPageSeal") === "true",
    copies: formData.get("copies") ?? "1",
    urgency: formData.get("urgency") ?? "NORMAL",
    requestNote: formData.get("requestNote") || "",
    parentSealRequestId: formData.get("parentSealRequestId") || null
  };
  const data = sealCreateSchema.parse(raw);

  const alsoLegalRep =
    formData.get("alsoLegalRep") === "true" && data.sealType !== "LEGAL_REP_SEAL";

  const existingDraftDocId = formData.get("existingDraftDocId");
  const draftFile = formData.get("draftDoc");

  if (data.matterId) {
    await assertCanAssociateMatter(session.user.id, data.matterId);
    await assertMatterWritable(data.matterId);
    const m = await prisma.matter.findUnique({
      where: { id: data.matterId },
      select: { id: true }
    });
    if (!m) throw new Error("El caso asociado no existe");
  }

  let plainBuf: Buffer;
  let draftDocPrepare: {
    name: string;
    mimeType: string;
    size: number;
    sha: string;
    path: string;
    algorithm: string;
    iv: string;
    authTag: string;
  };

  if (typeof existingDraftDocId === "string" && existingDraftDocId) {
    const src = await prisma.document.findUnique({
      where: { id: existingDraftDocId }
    });
    if (!src) throw new Error("El documento a sellar no existe");
    assertPdfDocument(src);
    const srcCt = await storage.readFile(src.path);
    plainBuf =
      src.encrypted && src.iv && src.authTag
        ? decryptBuffer(srcCt, src.iv, src.authTag)
        : srcCt;
    const enc = encryptBuffer(plainBuf);
    const newPath = await storage.writeFile(
      data.matterId ? `m_${data.matterId}` : "seals",
      enc.ciphertext
    );
    draftDocPrepare = {
      name: src.name,
      mimeType: src.mimeType ?? "application/octet-stream",
      size: src.size ?? plainBuf.length,
      sha: sha256(plainBuf),
      path: newPath,
      algorithm: enc.algorithm,
      iv: enc.iv.toString("base64"),
      authTag: enc.authTag.toString("base64")
    };
  } else if (draftFile instanceof File && draftFile.size > 0) {
    assertPdfDocument(draftFile);
    validateUploadedFile(draftFile, { purpose: "seal", maxBytes: MAX_FILE_SIZE });
    plainBuf = Buffer.from(await draftFile.arrayBuffer());
    const enc = encryptBuffer(plainBuf);
    const newPath = await storage.writeFile(
      data.matterId ? `m_${data.matterId}` : "seals",
      enc.ciphertext
    );
    draftDocPrepare = {
      name: normalizeUploadedFilename(draftFile.name),
      mimeType: draftFile.type || "application/octet-stream",
      size: draftFile.size,
      sha: sha256(plainBuf),
      path: newPath,
      algorithm: enc.algorithm,
      iv: enc.iv.toString("base64"),
      authTag: enc.authTag.toString("base64")
    };
  } else {
    throw new Error("Por favor suba el borrador a sellar");
  }

  const code = await generateSealCode();
  const legalRepCode = alsoLegalRep ? await generateSealCode() : null;

  let legalRepDocPrepare: typeof draftDocPrepare | null = null;
  if (alsoLegalRep) {
    const enc2 = encryptBuffer(plainBuf);
    const path2 = await storage.writeFile(
      data.matterId ? `m_${data.matterId}` : "seals",
      enc2.ciphertext
    );
    legalRepDocPrepare = {
      name: draftDocPrepare.name,
      mimeType: draftDocPrepare.mimeType,
      size: draftDocPrepare.size,
      sha: draftDocPrepare.sha,
      path: path2,
      algorithm: enc2.algorithm,
      iv: enc2.iv.toString("base64"),
      authTag: enc2.authTag.toString("base64")
    };
  }

  const created = await prisma.$transaction(async (tx) => {
    const draftDoc = await tx.document.create({
      data: {
        matterId: data.matterId ?? undefined,
        name: draftDocPrepare.name,
        category: "OTHER",
        path: draftDocPrepare.path,
        mimeType: draftDocPrepare.mimeType,
        size: draftDocPrepare.size,
        sha256: draftDocPrepare.sha,
        encrypted: true,
        algorithm: draftDocPrepare.algorithm,
        iv: draftDocPrepare.iv,
        authTag: draftDocPrepare.authTag,
        tags: ["Solicitud de sello", "Borrador a sellar"],
        uploadedById: await resolveTenantUserId(session.user.email) ?? session.user.id
      }
    });

    const seal = await tx.sealRequest.create({
      data: {
        code,
        sealType: data.sealType,
        matterId: data.matterId ?? undefined,
        purpose: data.purpose.trim(),
        documentTitle: data.documentTitle.trim(),
        pageCount: data.pageCount,
        requireCrossPageSeal: data.requireCrossPageSeal,
        copies: data.copies,
        urgency: data.urgency,
        requestNote: (data.requestNote || "").trim() || null,
        draftDocId: draftDoc.id,
        requestedById: await resolveTenantUserId(session.user.email) ?? session.user.id,
        status: "PENDING",
        parentSealRequestId: data.parentSealRequestId ?? undefined
      }
    });

    let legalRepSealId: string | null = null;
    if (legalRepDocPrepare && legalRepCode) {
      const legalRepDoc = await tx.document.create({
        data: {
          matterId: data.matterId ?? undefined,
          name: legalRepDocPrepare.name,
          category: "OTHER",
          path: legalRepDocPrepare.path,
          mimeType: legalRepDocPrepare.mimeType,
          size: legalRepDocPrepare.size,
          sha256: legalRepDocPrepare.sha,
          encrypted: true,
          algorithm: legalRepDocPrepare.algorithm,
          iv: legalRepDocPrepare.iv,
          authTag: legalRepDocPrepare.authTag,
          tags: ["Solicitud de sello", "Borrador a sellar", "Copia sello representante legal"],
          uploadedById: session.user.id
        }
      });
      const legalRepSeal = await tx.sealRequest.create({
        data: {
          code: legalRepCode,
          sealType: "LEGAL_REP_SEAL",
          matterId: data.matterId ?? undefined,
          purpose: `${data.purpose.trim()} (junto con ${code})`,
          documentTitle: data.documentTitle.trim(),
          pageCount: data.pageCount,
          requireCrossPageSeal: data.requireCrossPageSeal,
          copies: data.copies,
          urgency: data.urgency,
          requestNote: (data.requestNote || "").trim() || null,
          draftDocId: legalRepDoc.id,
          requestedById: session.user.id,
          status: "PENDING",
          parentSealRequestId: seal.id
        }
      });
      legalRepSealId = legalRepSeal.id;
    }

    return { seal, legalRepSealId };
  });

  await audit({
    userId: session.user.id,
    action: "SEAL_REQUEST_CREATE",
    targetType: "SealRequest",
    targetId: created.seal.id,
    detail: {
      code,
      sealType: data.sealType,
      matterId: data.matterId,
      alsoLegalRep: !!created.legalRepSealId
    }
  });

  if (created.legalRepSealId && legalRepCode) {
    await audit({
      userId: session.user.id,
      action: "SEAL_REQUEST_CREATE",
      targetType: "SealRequest",
      targetId: created.legalRepSealId,
      detail: {
        code: legalRepCode,
        sealType: "LEGAL_REP_SEAL",
        matterId: data.matterId,
        parentCode: code
      }
    });
  }

  await notifySealApprovalRequested({
    sealRequestId: created.seal.id,
    code,
    sealType: data.sealType,
    documentTitle: data.documentTitle.trim(),
    purpose: data.purpose.trim(),
    requesterId: session.user.id,
    requesterName: session.user.name,
    urgency: data.urgency
  });

  if (created.legalRepSealId && legalRepCode) {
    await notifySealApprovalRequested({
      sealRequestId: created.legalRepSealId,
      code: legalRepCode,
      sealType: "LEGAL_REP_SEAL",
      documentTitle: data.documentTitle.trim(),
      purpose: `${data.purpose.trim()} (junto con ${code})`,
      requesterId: session.user.id,
      requesterName: session.user.name,
      urgency: data.urgency
    });
  }

  revalidatePath("/approvals/seals");
  if (data.matterId) await revalidateMatter(data.matterId);
  return { ok: true, id: created.seal.id, code };
}

// Aprobar
export async function approveSealRequest(input: z.infer<typeof sealApproveSchema>) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const data = sealApproveSchema.parse(input);

  const seal = await prisma.sealRequest.findUnique({
    where: { id: data.id },
    select: { id: true, status: true, sealType: true, matterId: true, requestedById: true }
  });
  if (!seal) throw new Error("La solicitud no existe");
  if (seal.status !== "PENDING") throw new Error("Esta solicitud ya fue procesada");

  const ok = await canApproveSealType(seal.sealType, session.user);
  if (!ok) throw new Error("Sin permiso para aprobar este tipo de sello");

  await prisma.sealRequest.update({
    where: { id: data.id },
    data: {
      status: "APPROVED",
      approveNote: (data.note || "").trim() || null,
      approvedById: session.user.id,
      approvedAt: new Date()
    }
  });

  await audit({
    userId: session.user.id,
    action: "SEAL_APPROVED",
    targetType: "SealRequest",
    targetId: data.id,
    detail: { sealType: seal.sealType }
  });

  await createNotification({
    userId: seal.requestedById,
    type: "SEAL_STATUS_CHANGE",
    title: "Solicitud de sello aprobada",
    content: `Su solicitud de sello (${seal.sealType}) fue aprobada`,
    href: "/approvals/seals",
    refType: "SealRequest",
    refId: data.id
  });

  revalidatePath("/approvals/seals");
  if (seal.matterId) await revalidateMatter(seal.matterId);
  return { ok: true };
}

// Rechazar
export async function rejectSealRequest(input: z.infer<typeof sealRejectSchema>) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const data = sealRejectSchema.parse(input);

  const seal = await prisma.sealRequest.findUnique({
    where: { id: data.id },
    select: { id: true, status: true, sealType: true, matterId: true, requestedById: true }
  });
  if (!seal) throw new Error("La solicitud no existe");
  if (seal.status !== "PENDING") throw new Error("Esta solicitud ya fue procesada");

  const ok = await canApproveSealType(seal.sealType, session.user);
  if (!ok) throw new Error("Sin permiso para rechazar este tipo de sello");

  await prisma.sealRequest.update({
    where: { id: data.id },
    data: {
      status: "REJECTED",
      approveNote: data.reason,
      approvedById: session.user.id,
      approvedAt: new Date(),
      rejectedAt: new Date()
    }
  });

  await audit({
    userId: session.user.id,
    action: "SEAL_REJECTED",
    targetType: "SealRequest",
    targetId: data.id,
    detail: { reason: data.reason }
  });

  await createNotification({
    userId: seal.requestedById,
    type: "SEAL_STATUS_CHANGE",
    title: "Solicitud de sello rechazada",
    content: `Su solicitud de sello (${seal.sealType}) fue rechazada. Motivo: ${data.reason}`,
    href: "/approvals/seals",
    refType: "SealRequest",
    refId: data.id
  });

  revalidatePath("/approvals/seals");
  if (seal.matterId) await revalidateMatter(seal.matterId);
  return { ok: true };
}

// Completar sellado (FormData: stampedDoc obligatorio)
export async function stampSealRequest(formData: FormData) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) throw new Error("Falta id");

  const seal = await prisma.sealRequest.findUnique({
    where: { id },
    select: { id: true, status: true, sealType: true, matterId: true, requestedById: true }
  });
  if (!seal) throw new Error("La solicitud no existe");
  if (seal.status !== "APPROVED") throw new Error("Solo las solicitudes aprobadas pueden cargar el documento sellado");

  const okApprover = await canApproveSealType(seal.sealType, session.user);
  const okRequester = seal.requestedById === session.user.id;
  if (!okRequester && !okApprover) throw new Error("Sin permiso para cargar el documento sellado");

  const stampedFile = formData.get("stampedDoc");
  if (!(stampedFile instanceof File) || stampedFile.size === 0) {
    throw new Error("Por favor suba el escaneo del documento sellado");
  }
  assertPdfDocument(stampedFile);
  validateUploadedFile(stampedFile, { purpose: "stamp", maxBytes: MAX_FILE_SIZE });

  const buf = Buffer.from(await stampedFile.arrayBuffer());
  const enc = encryptBuffer(buf);
  const path = await storage.writeFile(
    seal.matterId ? `m_${seal.matterId}` : "seals",
    enc.ciphertext
  );

  await prisma.$transaction(async (tx) => {
    const stampedDoc = await tx.document.create({
      data: {
        matterId: seal.matterId ?? undefined,
        name: normalizeUploadedFilename(stampedFile.name),
        category: "OTHER",
        path,
        mimeType: stampedFile.type || "application/octet-stream",
        size: stampedFile.size,
        sha256: sha256(buf),
        encrypted: true,
        algorithm: enc.algorithm,
        iv: enc.iv.toString("base64"),
        authTag: enc.authTag.toString("base64"),
        tags: ["Solicitud de sello", "Escaneo sellado"],
        uploadedById: session.user.id
      }
    });
    await tx.sealRequest.update({
      where: { id },
      data: {
        status: "STAMPED",
        stampedDocId: stampedDoc.id,
        stampedById: session.user.id,
        stampedAt: new Date()
      }
    });
  });

  await audit({
    userId: session.user.id,
    action: "SEAL_STAMPED",
    targetType: "SealRequest",
    targetId: id,
    detail: { sealType: seal.sealType }
  });

  revalidatePath("/approvals/seals");
  if (seal.matterId) await revalidateMatter(seal.matterId);
  return { ok: true };
}

// Cancelar (solo pendiente + solo solicitante/administrador)
export async function cancelSealRequest(input: z.infer<typeof sealCancelSchema>) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const data = sealCancelSchema.parse(input);

  const seal = await prisma.sealRequest.findUnique({
    where: { id: data.id },
    select: { id: true, status: true, requestedById: true, matterId: true }
  });
  if (!seal) throw new Error("La solicitud no existe");
  if (seal.status !== "PENDING") throw new Error("Solo las solicitudes pendientes pueden cancelarse");

  const isOwner = seal.requestedById === session.user.id;
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "PRINCIPAL_LAWYER";
  if (!isOwner && !isAdmin) throw new Error("Solo el solicitante o el administrador pueden cancelar");

  await prisma.sealRequest.update({
    where: { id: data.id },
    data: { status: "CANCELLED" }
  });

  await audit({
    userId: session.user.id,
    action: "SEAL_CANCELLED",
    targetType: "SealRequest",
    targetId: data.id
  });

  revalidatePath("/approvals/seals");
  if (seal.matterId) await revalidateMatter(seal.matterId);
  return { ok: true };
}
async function resolveTenantUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });
  return user?.id ?? null;
}