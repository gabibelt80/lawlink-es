"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { clientVisibilityFilter, isManager } from "@/lib/permissions";
import { generateClientCode } from "./code-generator";
import {
  clientCreateSchema,
  clientUpdateSchema,
  clientListQuerySchema,
  contactInputSchema,
  type ClientCreateInput,
  type ClientUpdateInput,
  type ContactInput,
  type ClientListQuery,
} from "./schemas";

// Los strings vacÃ­os se convierten a null (Prisma no acepta "" en campos anulables)
function emptyToNull<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === "" ? null : v;
  }
  return out as T;
}

export async function listClients(input: Partial<ClientListQuery> = {}) {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  const query = clientListQuerySchema.parse(input);

  const where: Prisma.ClientWhereInput = {
    ...clientVisibilityFilter(session.user.id, session.user.role),
    deletedAt: null,
    ...(query.type ? { type: query.type } : {}),
    ...(query.tag ? { tags: { array_contains: query.tag } } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search } },
            { idNumber: { contains: query.search } },
            { phone: { contains: query.search } },
            { email: { contains: query.search } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        contacts: { where: { isPrimary: true }, take: 1 },
        _count: { select: { matters: true, intakes: true } },
      },
    }),
    prisma.client.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getClientById(id: string) {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  // Control de permisos: manager/finance ven todo, los demÃ¡s necesitan casos asociados
  if (!isManager(session.user.role) && session.user.role !== "FINANCE") {
    const accessible = await prisma.client.findFirst({
      where: {
        id,
        deletedAt: null,
        ...clientVisibilityFilter(session.user.id, session.user.role),
      },
      select: { id: true },
    });
    if (!accessible) throw new Error("Cliente no existe");
  }
  const client = await prisma.client.findFirst({
    where: { id, deletedAt: null },
    include: {
      contacts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      matters: {
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 50,
        select: {
          id: true,
          internalCode: true,
          title: true,
          category: true,
          status: true,
          updatedAt: true,
        },
      },
    },
  });

  if (client) {
    await audit({
      userId: session.user.id,
      action: "CLIENT_VIEW",
      targetType: "Client",
      targetId: id,
    });
  }
  return client;
}

// v0.37: Resumen financiero del cliente â€” agrega contratos/por cobrar/cobrado de todos los casos del cliente
export async function getClientFinanceSummary(clientId: string) {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  // Permisos: igual que getClientById
  if (!isManager(session.user.role) && session.user.role !== "FINANCE") {
    const accessible = await prisma.client.findFirst({
      where: {
        id: clientId,
        deletedAt: null,
        ...clientVisibilityFilter(session.user.id, session.user.role),
      },
      select: { id: true },
    });
    if (!accessible) throw new Error("Cliente no existe");
  }

  const matterWhere = { primaryClientId: clientId, deletedAt: null };
  const [billings, fees, matterCount] = await Promise.all([
    prisma.billing.findMany({
      where: { matter: matterWhere },
      include: {
        matter: { select: { id: true, internalCode: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.feeEntry.findMany({
      where: { type: { in: ["RECEIVABLE", "RECEIVED"] }, matter: matterWhere },
      select: { type: true, amount: true },
    }),
    prisma.matter.count({ where: matterWhere }),
  ]);

  const contractTotal = billings.reduce(
    (s, b) => s + Number(b.contractAmount),
    0,
  );
  const receivable = fees
    .filter((f) => f.type === "RECEIVABLE")
    .reduce((s, f) => s + Number(f.amount), 0);
  const received = fees
    .filter((f) => f.type === "RECEIVED")
    .reduce((s, f) => s + Number(f.amount), 0);

  return {
    contractTotal,
    receivable,
    received,
    pending: Math.max(0, receivable - received),
    matterCount,
    billings: billings.map((b) => ({
      id: b.id,
      title: b.title,
      status: b.status,
      contractAmount: Number(b.contractAmount),
      signedAt: b.signedAt,
      matter: b.matter,
    })),
  };
}

export async function createClient(input: ClientCreateInput) {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  const data = clientCreateSchema.parse(input);

  const internalCode = await generateClientCode();
  const created = await prisma.client.create({
    data: {
      ...emptyToNull({
        name: data.name,
        type: data.type,
        idNumber: data.idNumber,
        address: data.address,
        phone: data.phone,
        email: data.email,
        source: data.source,
        notes: data.notes,
        industry: data.industry,
        ethnicity: data.ethnicity,
      }),
      internalCode,
      cooperationStatus: data.cooperationStatus,
      gender: data.gender || null,
      tags: data.tags,
      contacts: {
        create: data.contacts.map((c) =>
          emptyToNull({
            name: c.name,
            title: c.title,
            phone: c.phone,
            email: c.email,
            wechat: c.wechat,
            isPrimary: c.isPrimary,
            notes: c.notes,
          }),
        ),
      },
    },
  });

  await audit({
    userId: session.user.id,
    action: "CLIENT_CREATE",
    targetType: "Client",
    targetId: created.id,
    detail: { name: created.name, type: created.type },
  });

  revalidatePath("/clients");
  return { ok: true, id: created.id };
}

export async function updateClient(input: ClientUpdateInput) {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  if (!isManager(session.user.role)) {
    throw new Error(
      "Solo el Administrador o el Abogado Principal puede editar la informaciÃ³n del cliente",
    );
  }
  const data = clientUpdateSchema.parse(input);
  const { id, contacts, gender, ...rest } = data;

  // Estrategia simple: eliminar todos los contactos + crearlos de nuevo. Se puede optimizar con diff mÃ¡s adelante
  await prisma.$transaction([
    prisma.contact.deleteMany({ where: { clientId: id } }),
    prisma.client.update({
      where: { id },
      data: {
        ...emptyToNull(rest),
        gender: gender || null,
        tags: data.tags,
        contacts: {
          create: contacts.map((c) =>
            emptyToNull({
              name: c.name,
              title: c.title,
              phone: c.phone,
              email: c.email,
              wechat: c.wechat,
              isPrimary: c.isPrimary,
              notes: c.notes,
            }),
          ),
        },
      },
    }),
  ]);

  await audit({
    userId: session.user.id,
    action: "CLIENT_UPDATE",
    targetType: "Client",
    targetId: id,
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return { ok: true, id };
}

export async function softDeleteClient(id: string) {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  if (
    session.user.role !== "ADMIN" &&
    session.user.role !== "PRINCIPAL_LAWYER"
  ) {
    throw new Error(
      "Solo el Administrador o el Abogado Principal puede eliminar el cliente",
    );
  }

  await prisma.client.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await audit({
    userId: session.user.id,
    action: "CLIENT_DELETE",
    targetType: "Client",
    targetId: id,
  });

  revalidatePath("/clients");
  return { ok: true };
}

// Acciones de contacto separadas (para editar rÃ¡pidamente contactos desde la pÃ¡gina de detalle, sin reescribir todo el cliente)
export async function addContact(clientId: string, input: ContactInput) {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  if (!isManager(session.user.role)) {
    throw new Error(
      "Solo el Administrador o el Abogado Principal puede editar contactos",
    );
  }
  const data = contactInputSchema.parse(input);
  const created = await prisma.contact.create({
    data: { clientId, ...emptyToNull(data) },
  });
  await audit({
    userId: session.user.id,
    action: "CONTACT_CREATE",
    targetType: "Contact",
    targetId: created.id,
    detail: { clientId },
  });
  revalidatePath(`/clients/${clientId}`);
  return { ok: true, id: created.id };
}

export async function deleteContact(id: string) {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  if (!isManager(session.user.role)) {
    throw new Error(
      "Solo el Administrador o el Abogado Principal puede eliminar contactos",
    );
  }
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) return { ok: false };
  await prisma.contact.delete({ where: { id } });
  await audit({
    userId: session.user.id,
    action: "CONTACT_DELETE",
    targetType: "Contact",
    targetId: id,
    detail: { clientId: contact.clientId },
  });
  revalidatePath(`/clients/${contact.clientId}`);
  return { ok: true };
}

