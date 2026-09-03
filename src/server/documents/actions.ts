"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { assertDocumentWritable } from "@/lib/archive/guard";
import { matterVisibilityFilter, isManager, assertCanAccessMatter, assertCanLeadMatter } from "@/lib/permissions";
import { storage } from "@/lib/storage";
import { validateUploadedFile } from "@/lib/storage/file-validator";
import { encryptBuffer, sha256 } from "@/lib/storage/crypto";
import { revalidateMatter } from "@/server/matters/route";

const documentCategorySchema = z.enum([
  "EVIDENCE",
  "PLEADING",
  "PROCEDURE",
  "JUDGMENT",
  "CONTRACT",
  "OTHER"
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * ä¸Šä¼ ææ–™ã€‚å‰ç«¯Aprobar Server Action ä¼  FormDataï¼Œå« fileï¼ˆFileï¼‰ã€metadataã€‚
 * åŠ å¯†åˆ†æ”¯ï¼šencrypted=true æ—¶æŠŠæ–‡ä»¶ç”¨ AES-256-GCM åŠ å¯†åŽå†™ç›˜ã€‚
 */
export async function uploadDocument(formData: FormData) {
  const session = await requireSession();

  const matterIdRaw = formData.get("matterId");
  const intakeIdRaw = formData.get("intakeId");
  const procedureId = formData.get("procedureId");
  const folderIdRaw = formData.get("folderId");
  const name = formData.get("name");
  const category = formData.get("category");
  const encrypted = formData.get("encrypted") === "true";
  const tagsRaw = formData.get("tags");
  const archiveChecklistItemIdRaw = formData.get("archiveChecklistItemId");
  const stageIdRaw = formData.get("stageId");
  const sourcePartyRaw = formData.get("sourceParty");
  const file = formData.get("file");

  if (!(file instanceof File)) throw new Error("ç¼ºå°‘æ–‡ä»¶");

  const matterId = typeof matterIdRaw === "string" && matterIdRaw ? matterIdRaw : null;
  const intakeId = typeof intakeIdRaw === "string" && intakeIdRaw ? intakeIdRaw : null;
  if (!matterId && !intakeId) throw new Error("matterId æˆ– intakeId è‡³å°‘éœ€è¦ä¸€ä¸ª");

  if (typeof name !== "string" || !name.trim()) throw new Error("ææ–™Nombreå¿…å¡«");
  const parsedCategory = documentCategorySchema.parse(category || "OTHER");
  const tags =
    typeof tagsRaw === "string" && tagsRaw
      ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

  validateUploadedFile(file, { purpose: "document", maxBytes: MAX_FILE_SIZE });

  const folderId = typeof folderIdRaw === "string" && folderIdRaw ? folderIdRaw : null;
  const stageId = typeof stageIdRaw === "string" && stageIdRaw ? stageIdRaw : null;

  // æ ¡éªŒå½’å±žå¯¹è±¡å­˜åœ¨
  let folderName: string | null = null;
  if (matterId) {
    const matter = await prisma.matter.findUnique({
      where: { id: matterId, deletedAt: null },
      select: { id: true, status: true }
    });
    if (!matter) throw new Error("Casoä¸å­˜åœ¨");
    await assertCanAccessMatter(session.user.id, session.user.role, matterId);

    if (folderId) {
      const folder = await prisma.documentFolder.findUnique({
        where: { id: folderId },
        select: { matterId: true, name: true }
      });
      if (!folder || folder.matterId !== matterId) {
        throw new Error("ç›®æ ‡å·å®—yCasoä¸Coincidencia");
      }
      folderName = folder.name;
    }

    // v0.48: å½’å±žçŽ¯èŠ‚å¿…é¡»å±žäºŽæœ¬Casoï¼ˆä¸”y procedureId ä¸€è‡´æ—¶æ‰å¯ä¿¡ï¼‰
    if (stageId) {
      const stage = await prisma.matterStage.findUnique({
        where: { id: stageId },
        select: { procedureId: true, procedure: { select: { matterId: true } } }
      });
      if (!stage || stage.procedure.matterId !== matterId) {
        throw new Error("å½’å±žçŽ¯èŠ‚yCasoä¸Coincidencia");
      }
      if (typeof procedureId === "string" && procedureId && stage.procedureId !== procedureId) {
        throw new Error("å½’å±žçŽ¯èŠ‚yç¨‹åºä¸Coincidencia");
      }
    }

    // å½’æ¡£åŽä»…å…è®¸è¡¥ä¼ åˆ° ARCHIVE å·å®—ï¼ˆCerrar caso / å½’æ¡£ï¼‰ï¼Œç”± guard åˆ¤å®š
    await assertDocumentWritable(matterId, { kind: "upload", folderName });
  }
  if (intakeId) {
    const intake = await prisma.intake.findUnique({
      where: { id: intakeId },
      select: { id: true, status: true, createdById: true, ownerUserId: true, coUserIds: true }
    });
    if (!intake) throw new Error("æ”¶æ¡ˆè®°å½•ä¸å­˜åœ¨");
    if (intake.status === "DECLINED") throw new Error("å·²æ‹’ç»çš„æ”¶æ¡ˆä¸å¯ä¸Šä¼ ææ–™");
    const uid = session.user.id;
    if (
      !isManager(session.user.role) &&
      intake.createdById !== uid &&
      intake.ownerUserId !== uid &&
      !intake.coUserIds.includes(uid)
    ) {
      throw new Error("æ— æƒå‘è¯¥æ”¶æ¡ˆä¸Šä¼ ææ–™");
    }
  }

  const raw = Buffer.from(await file.arrayBuffer());
  const hash = sha256(raw);

  const storageBucket = matterId ? `m_${matterId}` : `i_${intakeId}`;

  let path: string;
  let iv: string | null = null;
  let authTag: string | null = null;
  let algorithm: string | null = null;

  if (encrypted) {
    const enc = encryptBuffer(raw);
    path = await storage.writeFile(storageBucket, enc.ciphertext);
    iv = enc.iv.toString("base64");
    authTag = enc.authTag.toString("base64");
    algorithm = enc.algorithm;
  } else {
    path = await storage.writeFile(storageBucket, raw);
  }

  const archiveChecklistItemId =
    typeof archiveChecklistItemIdRaw === "string" && archiveChecklistItemIdRaw
      ? archiveChecklistItemIdRaw
      : null;

  const created = await prisma.document.create({
    data: {
      matterId,
      intakeId,
      procedureId: typeof procedureId === "string" && procedureId ? procedureId : null,
      stageId: matterId ? stageId : null,
      folderId,
      name,
      category: parsedCategory,
      sourceParty:
        typeof sourcePartyRaw === "string" && sourcePartyRaw.trim()
          ? sourcePartyRaw.trim()
          : null,
      path,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      sha256: hash,
      encrypted,
      algorithm,
      iv,
      authTag,
      tags,
      archiveChecklistItemId,
      uploadedById: session.user.id
    }
  });

  await audit({
    userId: session.user.id,
    action: "DOCUMENT_UPLOAD",
    targetType: "Document",
    targetId: created.id,
    detail: { matterId, intakeId, name, encrypted, size: file.size }
  });

  // v0.43 Ã­tems4ï¼šå†™å…¥CasoåŠ¨æ€æ—¶é—´çº¿ï¼ˆä»…Casoæ–‡æ¡£ï¼‰
  if (matterId) {
    await prisma.timelineEvent.create({
      data: {
        matterId,
        eventType: "DOCUMENT_UPLOADED",
        title: `ä¸Šä¼ ææ–™ï¼š${name.trim()}`,
        occurredAt: new Date(),
        refType: "Document",
        refId: created.id
      }
    });
  }

  if (matterId) await revalidateMatter(matterId);
  if (intakeId) revalidatePath(`/intakes/${intakeId}`);
  return { ok: true, id: created.id };
}

export async function deleteDocument(id: string) {
  const session = await requireSession();
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return { ok: false };

  if (doc.matterId) {
    await assertDocumentWritable(doc.matterId, { kind: "modify" });
    if (doc.uploadedById !== session.user.id) {
      await assertCanLeadMatter(session.user.id, doc.matterId, "åªèƒ½Eliminarè‡ªå·±ä¸Šä¼ çš„ææ–™ï¼Œæˆ–ç”±æœ¬æ¡ˆä¸»åŠž/ååŠžEliminar");
    }
  } else if (
    doc.uploadedById !== session.user.id &&
    session.user.role !== "ADMIN" &&
    session.user.role !== "PRINCIPAL_LAWYER"
  ) {
    throw new Error("åªèƒ½Eliminarè‡ªå·±ä¸Šä¼ çš„ææ–™");
  }

  // è½¯Eliminarï¼ˆä¿ç•™æ–‡ä»¶ä»¥å¤‡å®¡è®¡ï¼‰ï¼Œå¦‚éœ€ç‰©ç†Eliminarèµ°å•ç‹¬è„šæœ¬
  await prisma.document.update({
    where: { id },
    data: { deletedAt: new Date() }
  });

  await audit({
    userId: session.user.id,
    action: "DOCUMENT_DELETE",
    targetType: "Document",
    targetId: id,
    detail: { matterId: doc.matterId, intakeId: doc.intakeId, name: doc.name }
  });

  if (doc.matterId) await revalidateMatter(doc.matterId);
  if (doc.intakeId) revalidatePath(`/intakes/${doc.intakeId}`);
  return { ok: true };
}

export async function hardDeleteDocument(id: string) {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("ä»… ADMIN å¯å½»åº•Eliminarææ–™");
  }
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return { ok: false };
  await assertDocumentWritable(doc.matterId, { kind: "modify" });

  await storage.deleteFile(doc.path);
  await prisma.document.delete({ where: { id } });

  await audit({
    userId: session.user.id,
    action: "DOCUMENT_HARD_DELETE",
    targetType: "Document",
    targetId: id,
    detail: { matterId: doc.matterId, intakeId: doc.intakeId, name: doc.name }
  });

  if (doc.matterId) await revalidateMatter(doc.matterId);
  if (doc.intakeId) revalidatePath(`/intakes/${doc.intakeId}`);
  return { ok: true };
}

const docListQuerySchema = z.object({
  search: z.string().optional(),
  category: documentCategorySchema.optional(),
  matterId: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200)
});

export async function listAllDocuments(input: Partial<z.infer<typeof docListQuerySchema>> = {}) {
  const session = await requireSession();
  const query = docListQuerySchema.parse(input);

  const visFilter = matterVisibilityFilter(session.user.id, session.user.role);
  const where: Prisma.DocumentWhereInput = {
    deletedAt: null,
    matter: { deletedAt: null, ...visFilter },
    ...(query.category ? { category: query.category } : {}),
    ...(query.matterId ? { matterId: query.matterId } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search } },
            { tags: { array_contains: query.search } }
          ]
        }
      : {})
  };

  return prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: query.limit,
    include: {
      matter: { select: { id: true, internalCode: true, title: true } },
      uploadedBy: { select: { id: true, name: true } }
    }
  });
}

// ============ v0.10: æ–‡ä¹¦AprobaciÃ³næµç¨‹ ============

export async function submitDocumentForReview(id: string) {
  const session = await requireSession();
  const doc = await prisma.document.findUnique({ where: { id, deletedAt: null } });
  if (!doc) throw new Error("ææ–™ä¸å­˜åœ¨");
  if (doc.matterId) {
    await assertCanAccessMatter(session.user.id, session.user.role, doc.matterId);
    await assertDocumentWritable(doc.matterId, { kind: "modify" });
  }
  if (doc.status !== "DRAFT") throw new Error("åªæœ‰è‰ç¨¿Estadoçš„ææ–™æ‰èƒ½Enviarå®¡æ ¸");

  await prisma.document.update({
    where: { id },
    data: { status: "PENDING_REVIEW" },
  });

  await audit({
    userId: session.user.id,
    action: "DOCUMENT_SUBMIT_REVIEW",
    targetType: "Document",
    targetId: id,
    detail: { matterId: doc.matterId, name: doc.name },
  });

  if (doc.matterId) await revalidateMatter(doc.matterId);
  return { ok: true };
}

export async function approveDocument(id: string) {
  const session = await requireSession();
  if (!isManager(session.user.role)) {
    throw new Error("ä»…Administrarå‘˜æˆ–ä¸»åŠžAbogadoå¯AprobaciÃ³næ–‡ä¹¦");
  }
  const doc = await prisma.document.findUnique({ where: { id, deletedAt: null } });
  if (!doc) throw new Error("ææ–™ä¸å­˜åœ¨");
  if (doc.status !== "PENDING_REVIEW") throw new Error("ææ–™ä¸åœ¨å¾…å®¡æ ¸Estado");

  await prisma.document.update({
    where: { id },
    data: {
      status: "APPROVED",
      approvedById: session.user.id,
      approvedAt: new Date(),
    },
  });

  await audit({
    userId: session.user.id,
    action: "DOCUMENT_APPROVE",
    targetType: "Document",
    targetId: id,
    detail: { matterId: doc.matterId, name: doc.name },
  });

  if (doc.matterId) await revalidateMatter(doc.matterId);
  return { ok: true };
}

export async function rejectDocument(id: string, reason?: string) {
  const session = await requireSession();
  if (!isManager(session.user.role)) {
    throw new Error("ä»…Administrarå‘˜æˆ–ä¸»åŠžAbogadoå¯Rechazaræ–‡ä¹¦");
  }
  const doc = await prisma.document.findUnique({ where: { id, deletedAt: null } });
  if (!doc) throw new Error("ææ–™ä¸å­˜åœ¨");
  if (doc.status !== "PENDING_REVIEW") throw new Error("ææ–™ä¸åœ¨å¾…å®¡æ ¸Estado");

  await prisma.document.update({
    where: { id },
    data: {
      status: "DRAFT",
      reviewedById: session.user.id,
      reviewedAt: new Date(),
    },
  });

  await audit({
    userId: session.user.id,
    action: "DOCUMENT_REJECT",
    targetType: "Document",
    targetId: id,
    detail: { matterId: doc.matterId, name: doc.name, reason },
  });

  if (doc.matterId) await revalidateMatter(doc.matterId);
  return { ok: true };
}

export async function fileDocument(id: string) {
  const session = await requireSession();
  const doc = await prisma.document.findUnique({ where: { id, deletedAt: null } });
  if (!doc) throw new Error("ææ–™ä¸å­˜åœ¨");
  if (doc.matterId)
    await assertCanAccessMatter(session.user.id, session.user.role, doc.matterId);
  if (doc.status !== "APPROVED") throw new Error("åªæœ‰å·²AprobaciÃ³nçš„ææ–™æ‰èƒ½å½’æ¡£");

  await prisma.document.update({
    where: { id },
    data: { status: "FILED" },
  });

  await audit({
    userId: session.user.id,
    action: "DOCUMENT_FILE",
    targetType: "Document",
    targetId: id,
    detail: { matterId: doc.matterId, name: doc.name },
  });

  if (doc.matterId) await revalidateMatter(doc.matterId);
  return { ok: true };
}


