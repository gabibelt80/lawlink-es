"use server";

/**
 * v0.27: Centro de servicios - Contactos externos
 *
 * Alcance: tribunales / fiscalias / notarias / arbitraje / otros estudios / peritos / otros
 *
 * Permisos: todos los usuarios pueden ver contactos aprobados y crear nuevos;
 * los usuarios regulares requieren aprobacion de un administrador.
 */
import { z } from "zod";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { isManager } from "@/lib/permissions";
import { createNotification } from "@/server/notifications/create";
import { notifyRoleApprovers } from "@/server/notifications/approval";
import { getWorkflowToggles } from "@/server/settings/workflow-toggles";
import type { Prisma } from "@prisma/client";

const categories = [
  "COURT",
  "PROSECUTOR",
  "POLICE",
  "NOTARY",
  "ARBITRATION",
  "OTHER_FIRM",
  "EXPERT",
  "OTHER"
] as const;

const externalContactSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(60),
  category: z.enum(categories),
  organization: z.string().max(120).optional().or(z.literal("")),
  title: z.string().max(60).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().max(80).optional().or(z.literal("")),
  wechat: z.string().max(60).optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
  tags: z.array(z.string().max(30)).default([])
});

const externalContactUpdateSchema = externalContactSchema.extend({
  id: z.string().cuid()
});

const externalContactReviewSchema = z.object({
  id: z.string().cuid(),
  note: z.string().max(500).optional().or(z.literal(""))
});

function empty(s?: string | null) {
  return s && s.trim() !== "" ? s.trim() : null;
}

export async function listExternalContacts(
  filter: { category?: (typeof categories)[number] | "ALL"; search?: string } = {}
) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const canReview = isManager(session.user.role);
  const where: Prisma.ExternalContactWhereInput = {
    archivedAt: null,
    status: canReview ? { in: ["APPROVED", "PENDING_REVIEW"] } : "APPROVED"
  };
  if (filter.category && filter.category !== "ALL") {
    where.category = filter.category;
  }
  if (filter.search && filter.search.trim()) {
    const q = filter.search.trim();
    where.OR = [
      { name: { contains: q } },
      { organization: { contains: q } },
      { phone: { contains: q } }
    ];
  }
  return prisma.externalContact.findMany({
    where,
    orderBy: [{ status: "asc" }, { category: "asc" }, { name: "asc" }],
    include: {
      createdBy: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } }
    }
  });
}

async function notifyRequester(userId: string, input: {
  title: string;
  content?: string;
  refId: string;
}) {
  await createNotification({
    userId,
    type: "SYSTEM",
    priority: "NORMAL",
    title: input.title,
    content: input.content,
    href: "/contacts",
    refType: "ExternalContact",
    refId: input.refId
  });
}

async function assertCanModify(id: string, sessionUserId: string, role: string) {
  const prisma = await getTenantPrisma();
  const c = await prisma.externalContact.findUnique({
    where: { id },
    select: { createdById: true }
  });
  if (!c) throw new Error("El contacto no existe");
  const allowed =
    role === "ADMIN" || role === "PRINCIPAL_LAWYER" || c.createdById === sessionUserId;
  if (!allowed) throw new Error("Sin permiso para modificar este contacto");
}

export async function createExternalContact(input: z.infer<typeof externalContactSchema>) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const data = externalContactSchema.parse(input);
  // v1.0: Revision desactivada por defecto (entorno de confianza)
  const { externalContactReview } = await getWorkflowToggles();
  const status =
    !externalContactReview || isManager(session.user.role) ? "APPROVED" : "PENDING_REVIEW";
  const created = await prisma.externalContact.create({
    data: {
      name: data.name.trim(),
      category: data.category,
      organization: empty(data.organization),
      title: empty(data.title),
      phone: empty(data.phone),
      email: empty(data.email),
      wechat: empty(data.wechat),
      address: empty(data.address),
      notes: empty(data.notes),
      tags: data.tags,
      createdById: session.user.id,
      status
    }
  });
  await audit({
    userId: session.user.id,
    action: "EXTERNAL_CONTACT_CREATE",
    targetType: "ExternalContact",
    targetId: created.id,
    detail: { name: created.name, category: created.category, status: created.status }
  });
  if (created.status === "PENDING_REVIEW") {
    await notifyRoleApprovers({
      roles: ["ADMIN", "PRINCIPAL_LAWYER"],
      excludeUserId: session.user.id,
      title: "Nuevo contacto externo pendiente de revision",
      content: `${session.user.name ?? "Un colega"} agrego el contacto externo "${created.name}"`,
      href: "/contacts",
      refType: "ExternalContact",
      refId: created.id,
      priority: "HIGH"
    });
  }
  revalidatePath("/contacts");
  return created;
}

export async function updateExternalContact(input: z.infer<typeof externalContactUpdateSchema>) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const data = externalContactUpdateSchema.parse(input);
  await assertCanModify(data.id, session.user.id, session.user.role);
  const updated = await prisma.externalContact.update({
    where: { id: data.id },
    data: {
      name: data.name.trim(),
      category: data.category,
      organization: empty(data.organization),
      title: empty(data.title),
      phone: empty(data.phone),
      email: empty(data.email),
      wechat: empty(data.wechat),
      address: empty(data.address),
      notes: empty(data.notes),
      tags: data.tags
    }
  });
  await audit({
    userId: session.user.id,
    action: "EXTERNAL_CONTACT_UPDATE",
    targetType: "ExternalContact",
    targetId: data.id,
    detail: { name: updated.name }
  });
  revalidatePath("/contacts");
  return updated;
}

export async function approveExternalContact(input: z.infer<typeof externalContactReviewSchema>) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  if (!isManager(session.user.role)) throw new Error("Solo el Administrador puede aprobar contactos");
  const data = externalContactReviewSchema.parse(input);
  const current = await prisma.externalContact.findUnique({
    where: { id: data.id },
    select: { id: true, name: true, status: true, createdById: true }
  });
  if (!current) throw new Error("El contacto no existe");
  if (current.status !== "PENDING_REVIEW") throw new Error("El contacto no esta pendiente de revision");

  const approved = await prisma.externalContact.update({
    where: { id: data.id },
    data: {
      status: "APPROVED",
      reviewedById: session.user.id,
      reviewedAt: new Date(),
      reviewNote: empty(data.note)
    }
  });

  await audit({
    userId: session.user.id,
    action: "EXTERNAL_CONTACT_APPROVE",
    targetType: "ExternalContact",
    targetId: data.id,
    detail: { name: approved.name, note: empty(data.note) }
  });
  if (current.createdById !== session.user.id) {
    await notifyRequester(current.createdById, {
      title: "Contacto externo aprobado",
      content: `El contacto externo "${approved.name}" fue aprobado`,
      refId: approved.id
    });
  }
  revalidatePath("/contacts");
  return approved;
}

export async function rejectExternalContact(input: z.infer<typeof externalContactReviewSchema>) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  if (!isManager(session.user.role)) throw new Error("Solo el Administrador puede rechazar contactos");
  const data = externalContactReviewSchema.parse(input);
  const current = await prisma.externalContact.findUnique({
    where: { id: data.id },
    select: { id: true, name: true, status: true, createdById: true }
  });
  if (!current) throw new Error("El contacto no existe");
  if (current.status !== "PENDING_REVIEW") throw new Error("El contacto no esta pendiente de revision");

  const rejected = await prisma.externalContact.update({
    where: { id: data.id },
    data: {
      status: "REJECTED",
      reviewedById: session.user.id,
      reviewedAt: new Date(),
      reviewNote: empty(data.note)
    }
  });

  await audit({
    userId: session.user.id,
    action: "EXTERNAL_CONTACT_REJECT",
    targetType: "ExternalContact",
    targetId: data.id,
    detail: { name: rejected.name, note: empty(data.note) }
  });
  if (current.createdById !== session.user.id) {
    await notifyRequester(current.createdById, {
      title: "Contacto externo no aprobado",
      content: `El contacto externo "${rejected.name}" no fue aprobado${data.note ? `: ${data.note}` : ""}`,
      refId: rejected.id
    });
  }
  revalidatePath("/contacts");
  return rejected;
}

export async function archiveExternalContact(id: string) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  await assertCanModify(id, session.user.id, session.user.role);
  await prisma.externalContact.update({
    where: { id },
    data: { archivedAt: new Date() }
  });
  await audit({
    userId: session.user.id,
    action: "EXTERNAL_CONTACT_ARCHIVE",
    targetType: "ExternalContact",
    targetId: id
  });
  revalidatePath("/contacts");
}