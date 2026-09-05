"use server";

/**
 * v0.27: Centro de servicios - Anuncios del estudio
 */
import { z } from "zod";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { emitAnnouncementChanged } from "@/app/api/announcements/sse/route";
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

async function resolveTenantUserId(email: string, prisma: any): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });
  return user?.id ?? null;
}

const announcementCreateSchema = z.object({
  title: z.string().min(1, "El titulo es obligatorio").max(120),
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
  const prisma = await getTenantPrisma();
  await requireSession();
  return prisma.announcement.findMany({
    where: includeArchived ? {} : { archivedAt: null },
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    include: {
      author: { select: { id: true, name: true } },
    },
  });
}

export async function listActiveBanners() {
  const prisma = await getTenantPrisma();
  await requireSession();
  const now = new Date();
  const banners = await prisma.announcement.findMany({
    where: {
      pinned: true,
      archivedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { publishedAt: "desc" },
    select: { id: true, title: true, content: true, publishedAt: true },
  });
  console.log("Banners encontrados:", banners.length);
  return banners;
}

export async function createAnnouncement(
  input: z.infer<typeof announcementCreateSchema>,
) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  assertCanManage(session.user.role);
  const data = announcementCreateSchema.parse(input);

  const tenantUserId = await resolveTenantUserId(session.user.email, prisma);
  if (!tenantUserId) throw new Error("Usuario no encontrado");

  const created = await prisma.announcement.create({
    data: {
      title: data.title.trim(),
      content: data.content,
      pinned: data.pinned,
      expiresAt: data.expiresAt ?? null,
      authorId: tenantUserId,
    },
  });

  await audit({
    userId: tenantUserId,
    action: "ANNOUNCEMENT_CREATE",
    targetType: "Announcement",
    targetId: created.id,
    detail: { title: created.title, pinned: created.pinned },
  });

  revalidatePath("/announcements");
  revalidatePath("/", "layout");
  emitAnnouncementChanged();
  return created;
}

export async function updateAnnouncement(
  input: z.infer<typeof announcementUpdateSchema>,
) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  assertCanManage(session.user.role);
  const data = announcementUpdateSchema.parse(input);

  const tenantUserId = await resolveTenantUserId(session.user.email, prisma);
  if (!tenantUserId) throw new Error("Usuario no encontrado");

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
    userId: tenantUserId,
    action: "ANNOUNCEMENT_UPDATE",
    targetType: "Announcement",
    targetId: data.id,
    detail: { title: updated.title, pinned: updated.pinned },
  });

  revalidatePath("/announcements");
  revalidatePath("/", "layout");
  emitAnnouncementChanged();
  return updated;
}

export async function archiveAnnouncement(id: string) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  assertCanManage(session.user.role);

  const tenantUserId = await resolveTenantUserId(session.user.email, prisma);
  if (!tenantUserId) throw new Error("Usuario no encontrado");

  await prisma.announcement.update({
    where: { id },
    data: { archivedAt: new Date() },
  });

  await audit({
    userId: tenantUserId,
    action: "ANNOUNCEMENT_ARCHIVE",
    targetType: "Announcement",
    targetId: id,
  });

  revalidatePath("/announcements");
  revalidatePath("/", "layout");
}