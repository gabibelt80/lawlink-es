"use server";

/**
 * v0.27: æœåŠ¡ä¸­å¿ƒ - å¾‹æ‰€Anuncio
 *
 * - ADMIN / ä¸»ä»»Abogado å¯Publicarã€Editarã€ç½®é¡¶ã€å½’æ¡£
 * - æ‰€æœ‰Iniciar sesiÃ³nç”¨æˆ·å¯è¯»
 * - pinned + æœªè¿‡æœŸ + æœªå½’æ¡£çš„Anuncioæ˜¾ç¤ºä¸ºé¡¶éƒ¨ banner
 */
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";

function assertCanManage(role: string) {
  if (role !== "ADMIN" && role !== "PRINCIPAL_LAWYER") {
    throw new Error(
      "Solo el Administrador / Abogado Principal puede publicar anuncios",
    );
  }
}

const announcementCreateSchema = z.object({
  title: z.string().min(1, "El tÃ­tulo es obligatorio").max(120),
  content: z.string().min(1, "El contenido es obligatorio").max(20000),
  pinned: z.boolean().default(false),
  expiresAt: z.coerce.date().optional().nullable(),
});

const announcementUpdateSchema = announcementCreateSchema.extend({
  id: z.string().cuid(),
});

export async function listAnnouncements({
  includeArchived = false,
}: { includeArchived?: boolean } = {}) {
  await requireSession();
  return prisma.announcement.findMany({
    where: includeArchived ? {} : { archivedAt: null },
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    include: {
      author: { select: { id: true, name: true } },
    },
  });
}

/**
 * é¡¶éƒ¨ bannerï¼špinned + æœªå½’æ¡£ + æœªè¿‡æœŸ
 */
export async function listActiveBanners() {
  await requireSession();
  const now = new Date();
  return prisma.announcement.findMany({
    where: {
      pinned: true,
      archivedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { publishedAt: "desc" },
    select: { id: true, title: true, content: true, publishedAt: true },
  });
}

export async function createAnnouncement(
  input: z.infer<typeof announcementCreateSchema>,
) {
  const session = await requireSession();
  assertCanManage(session.user.role);
  const data = announcementCreateSchema.parse(input);

  const created = await prisma.announcement.create({
    data: {
      title: data.title.trim(),
      content: data.content,
      pinned: data.pinned,
      expiresAt: data.expiresAt ?? null,
      authorId: session.user.id,
    },
  });

  await audit({
    userId: session.user.id,
    action: "ANNOUNCEMENT_CREATE",
    targetType: "Announcement",
    targetId: created.id,
    detail: { title: created.title, pinned: created.pinned },
  });

  revalidatePath("/announcements");
  revalidatePath("/", "layout"); // banner åœ¨å…¨ç«™å¸ƒå±€
  return created;
}

export async function updateAnnouncement(
  input: z.infer<typeof announcementUpdateSchema>,
) {
  const session = await requireSession();
  assertCanManage(session.user.role);
  const data = announcementUpdateSchema.parse(input);

  const updated = await prisma.announcement.update({
    where: { id: data.id },
    data: {
      title: data.title.trim(),
      content: data.content,
      pinned: data.pinned,
      expiresAt: data.expiresAt ?? null,
    },
  });

  await audit({
    userId: session.user.id,
    action: "ANNOUNCEMENT_UPDATE",
    targetType: "Announcement",
    targetId: data.id,
    detail: { title: updated.title, pinned: updated.pinned },
  });

  revalidatePath("/announcements");
  revalidatePath("/", "layout");
  return updated;
}

export async function archiveAnnouncement(id: string) {
  const session = await requireSession();
  assertCanManage(session.user.role);

  await prisma.announcement.update({
    where: { id },
    data: { archivedAt: new Date() },
  });

  await audit({
    userId: session.user.id,
    action: "ANNOUNCEMENT_ARCHIVE",
    targetType: "Announcement",
    targetId: id,
  });

  revalidatePath("/announcements");
  revalidatePath("/", "layout");
}


