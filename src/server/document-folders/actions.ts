"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanAccessMatter, assertCanLeadMatter } from "@/lib/permissions";
import {
  folderCreateSchema,
  folderRenameSchema,
  folderDeleteSchema,
  folderReorderSchema,
  moveDocumentToFolderSchema
} from "./schemas";
import { revalidateMatter } from "@/server/matters/route";

/** åˆ¤æ–­å½“å‰ç”¨æˆ·æ˜¯å¦èƒ½Editarè¯¥Casoçš„å·å®—ç»“æž„ï¼ˆä»…æœ¬æ¡ˆ LEAD / CO_LEADï¼‰ */
async function requireFolderEditor(matterId: string, session: { user: { id: string; role: string } }) {
  await assertCanLeadMatter(session.user.id, matterId, "ä»…Casoä¸»åŠž/ååŠžå¯Administrarå·å®—");
}

export async function listFoldersByMatter(matterId: string) {
  const session = await requireSession();
  await assertCanAccessMatter(session.user.id, session.user.role, matterId);
  return prisma.documentFolder.findMany({
    where: { matterId },
    orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { documents: true } }
    }
  });
}

export async function createFolder(input: z.infer<typeof folderCreateSchema>) {
  const session = await requireSession();
  const data = folderCreateSchema.parse(input);
  await requireFolderEditor(data.matterId, session);
  await assertMatterWritable(data.matterId);

  // è®¡ç®— orderIndexï¼ˆè¿½åŠ åˆ°æœ«å°¾ï¼‰
  const last = await prisma.documentFolder.findFirst({
    where: { matterId: data.matterId },
    orderBy: { orderIndex: "desc" },
    select: { orderIndex: true }
  });
  const orderIndex = (last?.orderIndex ?? -1) + 1;

  let created;
  try {
    created = await prisma.documentFolder.create({
      data: {
        matterId: data.matterId,
        name: data.name.trim(),
        orderIndex,
        isDefault: false
      }
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error(`å·²æœ‰åŒåå·å®—ã€Œ${data.name.trim()}ã€`);
    }
    throw e;
  }

  await audit({
    userId: session.user.id,
    action: "FOLDER_CREATE",
    targetType: "DocumentFolder",
    targetId: created.id,
    detail: { matterId: data.matterId, name: data.name }
  });

  await revalidateMatter(data.matterId);
  return { ok: true, id: created.id };
}

export async function renameFolder(input: z.infer<typeof folderRenameSchema>) {
  const session = await requireSession();
  const data = folderRenameSchema.parse(input);

  const folder = await prisma.documentFolder.findUnique({
    where: { id: data.id },
    select: { id: true, matterId: true }
  });
  if (!folder) throw new Error("å·å®—ä¸å­˜åœ¨");
  await requireFolderEditor(folder.matterId, session);
  await assertMatterWritable(folder.matterId);

  try {
    await prisma.documentFolder.update({
      where: { id: data.id },
      data: { name: data.name.trim() }
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error(`å·²æœ‰åŒåå·å®—ã€Œ${data.name.trim()}ã€`);
    }
    throw e;
  }

  await audit({
    userId: session.user.id,
    action: "FOLDER_RENAME",
    targetType: "DocumentFolder",
    targetId: data.id,
    detail: { name: data.name }
  });

  await revalidateMatter(folder.matterId);
  return { ok: true };
}

export async function deleteFolder(input: z.infer<typeof folderDeleteSchema>) {
  const session = await requireSession();
  const data = folderDeleteSchema.parse(input);

  const folder = await prisma.documentFolder.findUnique({
    where: { id: data.id },
    select: { id: true, matterId: true, isDefault: true, _count: { select: { documents: true } } }
  });
  if (!folder) throw new Error("å·å®—ä¸å­˜åœ¨");
  if (folder.isDefault) throw new Error("é»˜è®¤å·å®—ä¸å¯Eliminarï¼Œåªèƒ½æ”¹å");
  await requireFolderEditor(folder.matterId, session);
  await assertMatterWritable(folder.matterId);

  // å·å®—å†…çš„æ–‡æ¡£ä¸åˆ ï¼Œç§»åˆ°"æ•£ä»¶"ï¼ˆfolderId = nullï¼‰
  await prisma.$transaction([
    prisma.document.updateMany({
      where: { folderId: data.id },
      data: { folderId: null }
    }),
    prisma.documentFolder.delete({ where: { id: data.id } })
  ]);

  await audit({
    userId: session.user.id,
    action: "FOLDER_DELETE",
    targetType: "DocumentFolder",
    targetId: data.id,
    detail: { matterId: folder.matterId, documentsReleased: folder._count.documents }
  });

  await revalidateMatter(folder.matterId);
  return { ok: true };
}

export async function reorderFolders(input: z.infer<typeof folderReorderSchema>) {
  const session = await requireSession();
  const data = folderReorderSchema.parse(input);
  await requireFolderEditor(data.matterId, session);
  await assertMatterWritable(data.matterId);

  await prisma.$transaction(
    data.orderedIds.map((id, i) =>
      prisma.documentFolder.update({
        where: { id },
        data: { orderIndex: i }
      })
    )
  );

  await revalidateMatter(data.matterId);
  return { ok: true };
}

export async function moveDocumentToFolder(input: z.infer<typeof moveDocumentToFolderSchema>) {
  const session = await requireSession();
  const data = moveDocumentToFolderSchema.parse(input);

  const doc = await prisma.document.findUnique({
    where: { id: data.documentId },
    select: { id: true, matterId: true }
  });
  if (!doc || !doc.matterId) throw new Error("æ–‡æ¡£ä¸å­˜åœ¨æˆ–æœªå½’å±žCaso");

  // æ ¡éªŒç›®æ ‡å·å®—yæ–‡æ¡£åŒCaso
  if (data.folderId) {
    const folder = await prisma.documentFolder.findUnique({
      where: { id: data.folderId },
      select: { matterId: true }
    });
    if (!folder || folder.matterId !== doc.matterId) {
      throw new Error("ç›®æ ‡å·å®—yæ–‡æ¡£ä¸å±žäºŽåŒä¸€Caso");
    }
  }
  await requireFolderEditor(doc.matterId, session);
  await assertMatterWritable(doc.matterId);

  await prisma.document.update({
    where: { id: data.documentId },
    data: { folderId: data.folderId }
  });

  await audit({
    userId: session.user.id,
    action: "DOCUMENT_MOVE_FOLDER",
    targetType: "Document",
    targetId: data.documentId,
    detail: { folderId: data.folderId }
  });

  await revalidateMatter(doc.matterId);
  return { ok: true };
}


