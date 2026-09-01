"use server";

/**
 * v0.27: 服务中心 - 律所公告
 *
 * - ADMIN / 主任Abogado 可发布、Editar、置顶、归档
 * - 所有Iniciar sesión用户可读
 * - pinned + 未过期 + 未归档的公告显示为顶部 banner
 */
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";

function assertCanManage(role: string) {
  if (role !== "ADMIN" && role !== "PRINCIPAL_LAWYER") {
    throw new Error("仅Administrar员 / 主任Abogado可发布公告");
  }
}

const announcementCreateSchema = z.object({
  title: z.string().min(1, "标题必填").max(120),
  content: z.string().min(1, "内容必填").max(20000),
  pinned: z.boolean().default(false),
  expiresAt: z.coerce.date().optional().nullable()
});

const announcementUpdateSchema = announcementCreateSchema.extend({
  id: z.string().cuid()
});

export async function listAnnouncements({
  includeArchived = false
}: { includeArchived?: boolean } = {}) {
  await requireSession();
  return prisma.announcement.findMany({
    where: includeArchived ? {} : { archivedAt: null },
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    include: {
      author: { select: { id: true, name: true } }
    }
  });
}

/**
 * 顶部 banner：pinned + 未归档 + 未过期
 */
export async function listActiveBanners() {
  await requireSession();
  const now = new Date();
  return prisma.announcement.findMany({
    where: {
      pinned: true,
      archivedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
    },
    orderBy: { publishedAt: "desc" },
    select: { id: true, title: true, content: true, publishedAt: true }
  });
}

export async function createAnnouncement(input: z.infer<typeof announcementCreateSchema>) {
  const session = await requireSession();
  assertCanManage(session.user.role);
  const data = announcementCreateSchema.parse(input);

  const created = await prisma.announcement.create({
    data: {
      title: data.title.trim(),
      content: data.content,
      pinned: data.pinned,
      expiresAt: data.expiresAt ?? null,
      authorId: session.user.id
    }
  });

  await audit({
    userId: session.user.id,
    action: "ANNOUNCEMENT_CREATE",
    targetType: "Announcement",
    targetId: created.id,
    detail: { title: created.title, pinned: created.pinned }
  });

  revalidatePath("/announcements");
  revalidatePath("/", "layout"); // banner 在全站布局
  return created;
}

export async function updateAnnouncement(input: z.infer<typeof announcementUpdateSchema>) {
  const session = await requireSession();
  assertCanManage(session.user.role);
  const data = announcementUpdateSchema.parse(input);

  const updated = await prisma.announcement.update({
    where: { id: data.id },
    data: {
      title: data.title.trim(),
      content: data.content,
      pinned: data.pinned,
      expiresAt: data.expiresAt ?? null
    }
  });

  await audit({
    userId: session.user.id,
    action: "ANNOUNCEMENT_UPDATE",
    targetType: "Announcement",
    targetId: data.id,
    detail: { title: updated.title, pinned: updated.pinned }
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
    data: { archivedAt: new Date() }
  });

  await audit({
    userId: session.user.id,
    action: "ANNOUNCEMENT_ARCHIVE",
    targetType: "Announcement",
    targetId: id
  });

  revalidatePath("/announcements");
  revalidatePath("/", "layout");
}
