"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { assertMatterWritable } from "@/lib/archive/guard";
import { serializeDecimals } from "@/lib/decimal";
import {
  assertCanAccessMatter,
  assertCanAssociateMatter,
  assertCanLeadMatter,
  isManager,
  matterVisibilityFilter
} from "@/lib/permissions";
import {
  billingCreateSchema,
  feeEntryCreateSchema,
  commissionPlanSetSchema,
  type BillingCreateInput,
  type FeeEntryCreateInput,
  type CommissionPlanSetInput
} from "./schemas";
import { notifyRoleApprovers } from "@/server/notifications/approval";
import {
  invoiceMatterSearchLimit,
  invoiceMatterSearchWhere
} from "./invoice-matter-search";
import { revalidateMatter } from "@/server/matters/route";

// ============ Billing ============

export async function createBilling(input: BillingCreateInput) {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  const data = billingCreateSchema.parse(input);
  await assertMatterWritable(data.matterId, { allowFinanceRole: true });

  const created = await prisma.billing.create({
    data: {
      matterId: data.matterId,
      title: data.title,
      contractAmount: new Prisma.Decimal(data.contractAmount),
      schedule: data.schedule || null,
      status: data.status,
      signedAt: data.signedAt
    }
  });

  await audit({
    userId: session.user.id,
    action: "BILLING_CREATE",
    targetType: "Billing",
    targetId: created.id,
    detail: { matterId: data.matterId }
  });

  await revalidateMatter(data.matterId);
  return { ok: true, id: created.id };
}

export async function deleteBilling(id: string) {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  const billing = await prisma.billing.findUnique({
    where: { id },
    select: { matterId: true }
  });
  if (!billing) return { ok: false };

  if (session.user.role === "FINANCE") {
    await assertMatterWritable(billing.matterId, { allowFinanceRole: true });
  } else {
    await assertMatterWritable(billing.matterId);
    await assertCanLeadMatter(session.user.id, billing.matterId, "Solo el titular/co-titular del caso o Finanzas puede eliminar contratos");
  }

  await prisma.billing.delete({ where: { id } });
  await audit({
    userId: session.user.id,
    action: "BILLING_DELETE",
    targetType: "Billing",
    targetId: id
  });
  await revalidateMatter(billing.matterId);
  return { ok: true };
}

// ============ FeeEntry + comisión automática ============

/**
 * Crea un registro de cobro/pago.
 * - Al crear RECEIVED se deriva automáticamente un subregistro COMMISSION por cada beneficiario según CommissionPlan
 * - parent / children se vinculan por parentFeeEntryId
 */
export async function createFeeEntry(input: FeeEntryCreateInput) {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  const data = feeEntryCreateSchema.parse(input);
  await assertMatterWritable(data.matterId, { allowFinanceRole: true });

  const created = await prisma.$transaction(async (tx) => {
    const entry = await tx.feeEntry.create({
      data: {
        matterId: data.matterId,
        billingId: data.billingId || null,
        type: data.type,
        amount: new Prisma.Decimal(data.amount),
        occurredAt: data.occurredAt,
        invoiceNo: data.invoiceNo || null,
        payerOrPayee: data.payerOrPayee || null,
        method: data.method || null,
        note: data.note || null,
        recordedById: session.user.id
      }
    });

    // Comisión automática
    if (data.type === "RECEIVED" && data.amount > 0) {
      const plans = await tx.commissionPlan.findMany({
        where: { matterId: data.matterId, active: true }
      });
      for (const plan of plans) {
        const share = Number(plan.percent) * data.amount / 100;
        if (share <= 0) continue;
        await tx.feeEntry.create({
          data: {
            matterId: data.matterId,
            billingId: data.billingId || null,
            type: "COMMISSION",
            amount: new Prisma.Decimal(share.toFixed(2)),
            occurredAt: data.occurredAt,
            parentFeeEntryId: entry.id,
            beneficiaryUserId: plan.userId,
            note: plan.label ? `Según plan [${plan.label}] comisión automática ${plan.percent}%` : `Comisión automática ${plan.percent}%`,
            recordedById: session.user.id
          }
        });
      }
    }

    // Evento de cobro al timeline
    if (data.type === "RECEIVED") {
      await tx.timelineEvent.create({
        data: {
          matterId: data.matterId,
          eventType: "FEE_RECEIVED",
          title: `Cobrado $${data.amount.toLocaleString("es-AR")}`,
          content: data.note ?? undefined,
          occurredAt: data.occurredAt
        }
      });
    }

    return entry;
  });

  await audit({
    userId: session.user.id,
    action: "FEE_ENTRY_CREATE",
    targetType: "FeeEntry",
    targetId: created.id,
    detail: { matterId: data.matterId, type: data.type, amount: data.amount }
  });

  await revalidateMatter(data.matterId);
  revalidatePath("/finance");
  return { ok: true, id: created.id };
}

export async function deleteFeeEntry(id: string) {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  if (!isManager(session.user.role) && session.user.role !== "FINANCE") {
    throw new Error("Solo el administrador, el abogado principal o Finanzas puede eliminar registros de cobro/pago");
  }
  const entry = await prisma.feeEntry.findUnique({
    where: { id },
    include: { commissionChildren: { select: { id: true } } }
  });
  if (!entry) return { ok: false };
  await assertMatterWritable(entry.matterId, { allowFinanceRole: true });

  // Al eliminar el registro padre también se eliminan las comisiones derivadas
  await prisma.$transaction(async (tx) => {
    if (entry.commissionChildren.length > 0) {
      await tx.feeEntry.deleteMany({
        where: { id: { in: entry.commissionChildren.map((c) => c.id) } }
      });
    }
    await tx.feeEntry.delete({ where: { id } });
  });

  await audit({
    userId: session.user.id,
    action: "FEE_ENTRY_DELETE",
    targetType: "FeeEntry",
    targetId: id,
    detail: {
      matterId: entry.matterId,
      cascadedChildren: entry.commissionChildren.length
    }
  });
  await revalidateMatter(entry.matterId);
  revalidatePath("/finance");
  return { ok: true };
}

// ============ CommissionPlan ============

/**
 * Reemplaza por completo el plan de comisiones del caso.
 * Estrategia simple: elimina todos los planes existentes y crea nuevos según los items.
 */
export async function setCommissionPlan(input: CommissionPlanSetInput) {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  const data = commissionPlanSetSchema.parse(input);
  await assertMatterWritable(data.matterId);
  await assertCanLeadMatter(session.user.id, data.matterId, "Solo el titular/co-titular del caso puede configurar el plan de comisiones");

  await prisma.$transaction([
    prisma.commissionPlan.deleteMany({ where: { matterId: data.matterId } }),
    prisma.commissionPlan.createMany({
      data: data.items.map((it) => ({
        matterId: data.matterId,
        userId: it.userId,
        percent: new Prisma.Decimal(it.percent),
        label: it.label || null,
        active: true
      }))
    })
  ]);

  await audit({
    userId: session.user.id,
    action: "COMMISSION_PLAN_SET",
    targetType: "Matter",
    targetId: data.matterId,
    detail: { itemCount: data.items.length }
  });

  await revalidateMatter(data.matterId);
  return { ok: true };
}

// ============ Estadísticas financieras globales ============

export async function getMatterFinance(matterId: string) {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  await assertCanAccessMatter(session.user.id, session.user.role, matterId);

  const [billings, entries, plans, issuedInvoices] = await Promise.all([
    prisma.billing.findMany({
      where: { matterId },
      orderBy: { createdAt: "desc" }
    }),
    prisma.feeEntry.findMany({
      where: { matterId },
      orderBy: { occurredAt: "desc" },
      include: {
        beneficiaryUser: { select: { id: true, name: true } },
        parentFeeEntry: { select: { id: true, type: true } }
      }
    }),
    prisma.commissionPlan.findMany({
      where: { matterId },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "asc" }
    }),
    // Monto facturado: total de facturas emitidas
    prisma.invoiceRequest.findMany({
      where: { matterId, status: "ISSUED" },
      select: { amount: true }
    })
  ]);

  const sum = (filter: (e: (typeof entries)[number]) => boolean) =>
    entries.filter(filter).reduce((acc, e) => acc + Number(e.amount), 0);

  const stats = {
    contractAmount: billings.reduce((acc, b) => acc + Number(b.contractAmount), 0),
    receivable: sum((e) => e.type === "RECEIVABLE"),
    received: sum((e) => e.type === "RECEIVED"),
    refund: sum((e) => e.type === "REFUND"),
    cost: sum((e) => e.type === "COST"),
    commission: sum((e) => e.type === "COMMISSION"),
    invoiced: issuedInvoices.reduce((acc, i) => acc + Number(i.amount), 0)
  };

  return serializeDecimals({ billings, entries, plans, stats });
}

/**
 * v0.11: Lista las solicitudes de facturación del caso
 */
export async function listMatterInvoiceRequests(matterId: string) {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  await assertCanAccessMatter(session.user.id, session.user.role, matterId);
  const rows = await prisma.invoiceRequest.findMany({
    where: { matterId },
    orderBy: { requestedAt: "desc" },
    select: {
      id: true,
      amount: true,
      title: true,
      status: true,
      processNote: true,
      requestedAt: true,
      processedAt: true,
      invoiceType: true,
      invoiceItem: true,
      buyerName: true,
      buyerTaxNo: true,
      evidenceDocIds: true,
      invoiceNo: true,
      issuedAt: true
    }
  });
  return serializeDecimals(rows);
}

/**
 * v0.12: Obtiene la información por defecto del caso para facturar (titular del cliente + id de admisión asociada)
 */
export async function getMatterInvoiceContext(matterId: string) {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  await assertCanAccessMatter(session.user.id, session.user.role, matterId);
  const m = await prisma.matter.findUnique({
    where: { id: matterId },
    select: {
      id: true,
      title: true,
      intakeId: true,
      intake: {
        select: {
          id: true,
          status: true,
          receivedAt: true,
          client: { select: { name: true } }
        }
      },
      primaryClientId: true,
      primaryClient: { select: { id: true, name: true, idNumber: true } },
      clientLinks: {
        select: {
          isPrimary: true,
          client: { select: { id: true, name: true, idNumber: true } }
        }
      }
    }
  });
  if (!m) throw new Error("Caso no encontrado");

  const clientMap = new Map<
    string,
    { id: string; name: string; taxNo: string | null; isPrimary: boolean }
  >();
  if (m.primaryClient) {
    clientMap.set(m.primaryClient.id, {
      id: m.primaryClient.id,
      name: m.primaryClient.name,
      taxNo: m.primaryClient.idNumber ?? null,
      isPrimary: true
    });
  }
  for (const link of m.clientLinks) {
    if (!link.client) continue;
    const existing = clientMap.get(link.client.id);
    if (existing) {
      existing.isPrimary = existing.isPrimary || link.isPrimary;
    } else {
      clientMap.set(link.client.id, {
        id: link.client.id,
        name: link.client.name,
        taxNo: link.client.idNumber ?? null,
        isPrimary: link.isPrimary
      });
    }
  }
  const clientOptions = Array.from(clientMap.values()).sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary)
  );

  return {
    matterId: m.id,
    matterTitle: m.title,
    intakeId: m.intakeId ?? null,
    intake: m.intake
      ? {
          id: m.intake.id,
          status: m.intake.status,
          receivedAt: m.intake.receivedAt,
          clientName: m.intake.client?.name ?? null
        }
      : null,
    clientOptions,
    defaultBuyerName:
      m.primaryClient?.name ?? m.intake?.client?.name ?? null
  };
}

/**
 * v0.12: Crear solicitud de facturación (con tipo/concepto/titular/respaldo)
 */
export async function createInvoiceRequest(input: {
  matterId: string | null;
  noMatterReason?: string | null;
  amount: number;
  invoiceType: "PLAIN" | "SPECIAL";
  invoiceItem: "LAWYER_FEE" | "CONSULTING_FEE" | "AGENCY_FEE" | "OTHER";
  buyerName: string;
  buyerTaxNo?: string | null;
  buyerAddress?: string | null;
  buyerPhone?: string | null;
  buyerBank?: string | null;
  buyerBankAccount?: string | null;
  evidenceDocIds: string[];
  requestNote?: string | null;
}) {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  if (input.matterId) {
    await assertCanAssociateMatter(session.user.id, input.matterId);
  } else {
    if (!isManager(session.user.role) && session.user.role !== "FINANCE") {
      throw new Error("La facturación sin caso asociado solo puede iniciarla Finanzas / Administrador / Abogado principal");
    }
    if (!input.noMatterReason?.trim()) {
      throw new Error("Cuando no hay caso asociado se debe completar el motivo");
    }
  }

  if (input.amount <= 0) throw new Error("El monto debe ser mayor a 0");
  if (input.invoiceType !== "PLAIN" && input.invoiceType !== "SPECIAL") {
    throw new Error("Seleccioná el tipo de factura");
  }
  if (!input.buyerName.trim()) throw new Error("Completá el titular de la factura");
  if (input.invoiceType === "SPECIAL") {
    if (!input.buyerTaxNo?.trim()) throw new Error("La factura especial debe incluir el número de identificación fiscal");
    if (!input.buyerAddress?.trim()) throw new Error("La factura especial debe incluir la dirección del comprador");
    if (!input.buyerPhone?.trim()) throw new Error("La factura especial debe incluir el teléfono del comprador");
    if (!input.buyerBank?.trim()) throw new Error("La factura especial debe incluir el banco");
    if (!input.buyerBankAccount?.trim()) throw new Error("La factura especial debe incluir la cuenta bancaria");
  }
  if (input.matterId && input.evidenceDocIds.length === 0) {
    throw new Error("Subí al menos un respaldo de facturación (contrato de mandato escaneado, etc.)");
  }

  const isSpecial = input.invoiceType === "SPECIAL";
  const created = await prisma.invoiceRequest.create({
    data: {
      matterId: input.matterId,
      noMatterReason: input.matterId ? null : input.noMatterReason?.trim() || null,
      amount: input.amount,
      invoiceType: input.invoiceType,
      invoiceItem: input.invoiceItem,
      buyerName: input.buyerName.trim(),
      buyerTaxNo: input.buyerTaxNo?.trim() || null,
      buyerAddress: isSpecial ? input.buyerAddress?.trim() || null : null,
      buyerPhone: isSpecial ? input.buyerPhone?.trim() || null : null,
      buyerBank: isSpecial ? input.buyerBank?.trim() || null : null,
      buyerBankAccount: isSpecial ? input.buyerBankAccount?.trim() || null : null,
      evidenceDocIds: input.evidenceDocIds,
      title: input.buyerName.trim(),
      requestNote: input.requestNote?.trim() || null,
      requestedById: session.user.id
    },
    select: { id: true }
  });

  const matter = input.matterId
    ? await prisma.matter.findUnique({
        where: { id: input.matterId },
        select: { internalCode: true, title: true }
      })
    : null;

  await notifyRoleApprovers({
    roles: ["ADMIN", "PRINCIPAL_LAWYER", "FINANCE"],
    excludeUserId: session.user.id,
    title: "Nueva aprobación de factura pendiente",
    content: `${session.user.name ?? "Usuario"} envió una solicitud de facturación: ${
      matter ? `${matter.internalCode} ${matter.title}` : input.noMatterReason?.trim() || "Sin caso asociado"
    }，Monto ${input.amount.toLocaleString("es-AR")} ARS`,
    href: "/finance",
    refType: "InvoiceRequest",
    refId: created.id,
    priority: "HIGH"
  });

  revalidatePath("/finance");
  if (input.matterId) await revalidateMatter(input.matterId);
  return created;
}

export async function searchMattersForInvoice(q?: string) {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  return prisma.matter.findMany({
    where: invoiceMatterSearchWhere(session.user.id, q),
    select: { id: true, internalCode: true, title: true },
    orderBy: { createdAt: "desc" },
    take: invoiceMatterSearchLimit(q)
  });
}

export async function listAllFeeEntries(params: {
  type?: "RECEIVABLE" | "RECEIVED" | "REFUND" | "COST" | "COMMISSION";
  limit?: number;
}) {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  const visFilter = matterVisibilityFilter(session.user.id, session.user.role);
  const rows = await prisma.feeEntry.findMany({
    where: {
      ...(params.type ? { type: params.type } : {}),
      matter: { deletedAt: null, ...visFilter }
    },
    orderBy: { occurredAt: "desc" },
    take: params.limit ?? 100,
    include: {
      matter: { select: { id: true, internalCode: true, title: true } },
      beneficiaryUser: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, name: true } }
    }
  });
  return serializeDecimals(rows);
}

export async function getMonthlyRevenue(months = 6) {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  const visFilter = matterVisibilityFilter(session.user.id, session.user.role);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const entries = await prisma.feeEntry.findMany({
    where: {
      type: { in: ["RECEIVABLE", "RECEIVED"] },
      occurredAt: { gte: start },
      matter: { deletedAt: null, ...visFilter }
    },
    select: { type: true, amount: true, occurredAt: true }
  });

  const buckets: { month: string; received: number; receivable: number }[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    buckets.push({
      month: `${d.getMonth() + 1}M`,
      received: 0,
      receivable: 0
    });
  }

  for (const e of entries) {
    const d = new Date(e.occurredAt);
    const idx = (d.getFullYear() - start.getFullYear()) * 12 + d.getMonth() - start.getMonth();
    if (idx < 0 || idx >= months) continue;
    if (e.type === "RECEIVED") buckets[idx].received += Number(e.amount);
    if (e.type === "RECEIVABLE") buckets[idx].receivable += Number(e.amount);
  }

  return buckets;
}

export async function getPersonalRevenue(userId: string) {
  const session = await requireSession();
  const prisma = await getTenantPrisma();
  if (!isManager(session.user.role) && session.user.id !== userId) {
    throw new Error("Solo podés ver tus propios datos de ingresos");
  }
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const yearStart = new Date(monthStart.getFullYear(), 0, 1);

  const [monthly, yearly] = await Promise.all([
    prisma.feeEntry.aggregate({
      where: {
        type: "COMMISSION",
        beneficiaryUserId: userId,
        occurredAt: { gte: monthStart }
      },
      _sum: { amount: true }
    }),
    prisma.feeEntry.aggregate({
      where: {
        type: "COMMISSION",
        beneficiaryUserId: userId,
        occurredAt: { gte: yearStart }
      },
      _sum: { amount: true }
    })
  ]);

  return {
    monthlyCommission: Number(monthly._sum.amount ?? 0),
    yearlyCommission: Number(yearly._sum.amount ?? 0)
  };
}