"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanAssociateMatter, matterAssociationFilter } from "@/lib/permissions";
import { trackExpress, detectCompany } from "@/lib/express/track";
import {
  saveExpressSettings as saveSettings,
  readPublicExpressSettings
} from "@/lib/express/settings";
import {
  expressCreateSchema,
  expressListFilterSchema,
  expressIdSchema,
  expressSettingsSaveSchema
} from "./schemas";
import { revalidateMatter } from "@/server/matters/route";

// Listado / Consulta

export async function listExpress(input?: z.input<typeof expressListFilterSchema>) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const filter = expressListFilterSchema.parse(input ?? {});

  const accessWhere: Prisma.ExpressTrackingWhereInput = {
    OR: [
      { matter: { deletedAt: null, ...matterAssociationFilter(session.user.id) } },
      { matterId: null, createdById: session.user.id }
    ]
  };
  const where: Prisma.ExpressTrackingWhereInput = { AND: [accessWhere] };
  if (filter.scope === "mine") where.createdById = session.user.id;
  if (filter.direction !== "ALL") where.direction = filter.direction;
  if (filter.matterId) where.matterId = filter.matterId;
  if (filter.search) {
    where.AND = [
      accessWhere,
      {
        OR: [
          { trackingNo: { contains: filter.search } },
          { purpose: { contains: filter.search } },
          { recipient: { contains: filter.search } },
          { matter: { internalCode: { contains: filter.search } } },
          { matter: { title: { contains: filter.search } } }
        ]
      }
    ];
  }

  return prisma.expressTracking.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      matter: { select: { id: true, internalCode: true, title: true } },
      createdBy: { select: { id: true, name: true } }
    }
  });
}

export async function getExpress(id: string) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  await assertCanAccessExpressRecord(session.user.id, id);
  return prisma.expressTracking.findUnique({
    where: { id },
    include: {
      matter: { select: { id: true, internalCode: true, title: true } },
      createdBy: { select: { id: true, name: true } }
    }
  });
}

async function assertCanAccessExpressRecord(userId: string, id: string) {
  const record = await prisma.expressTracking.findUnique({
    where: { id },
    select: { id: true, matterId: true, createdById: true }
  });
  if (!record) throw new Error("El registro de envío no existe");
  if (record.matterId) {
    await assertCanAssociateMatter(userId, record.matterId);
    return record;
  }
  if (record.createdById !== userId) throw new Error("Sin permiso para acceder a este envío");
  return record;
}

// Crear + primera consulta

export async function createExpress(input: z.infer<typeof expressCreateSchema>) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const data = expressCreateSchema.parse(input);

  let companyCode = data.companyCode?.trim() || null;
  if (!companyCode) companyCode = detectCompany(data.trackingNo);

  if (data.matterId) {
    const m = await prisma.matter.findUnique({
      where: { id: data.matterId },
      select: { id: true }
    });
    if (!m) throw new Error("El caso asociado no existe");
    await assertCanAssociateMatter(session.user.id, data.matterId);
    await assertMatterWritable(data.matterId);
  }

  let lastState: string | null = null;
  let tracesJson: Prisma.InputJsonValue | undefined = undefined;
  let lastUpdateAt: Date | null = null;
  try {
    if (companyCode) {
      const r = await trackExpress({ trackingNo: data.trackingNo, companyCode });
      lastState = r.state;
      tracesJson = r.traces as unknown as Prisma.InputJsonValue;
      lastUpdateAt = new Date();
    }
  } catch {
    // Silencioso: el usuario puede actualizar manualmente más tarde
  }

  const created = await prisma.expressTracking.create({
    data: {
      trackingNo: data.trackingNo.trim(),
      companyCode,
      direction: data.direction,
      matterId: data.matterId ?? null,
      purpose: data.purpose.trim(),
      recipient: data.recipient?.trim() || null,
      recipientPhone: data.recipientPhone?.trim() || null,
      lastState,
      tracesJson,
      lastUpdateAt,
      createdById: session.user.id
    },
    select: { id: true, matterId: true }
  });

  await audit({
    userId: session.user.id,
    action: "EXPRESS_CREATE",
    targetType: "ExpressTracking",
    targetId: created.id,
    detail: { trackingNo: data.trackingNo, direction: data.direction }
  });

  revalidatePath("/express");
  if (created.matterId) await revalidateMatter(created.matterId);
  return { ok: true, id: created.id, firstState: lastState };
}

// Actualizar seguimiento

export async function refreshExpress(input: z.infer<typeof expressIdSchema>) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const data = expressIdSchema.parse(input);

  await assertCanAccessExpressRecord(session.user.id, data.id);
  const e = await prisma.expressTracking.findUniqueOrThrow({
    where: { id: data.id },
    select: { id: true, trackingNo: true, companyCode: true, matterId: true }
  });

  const r = await trackExpress({
    trackingNo: e.trackingNo,
    companyCode: e.companyCode ?? undefined
  });

  await prisma.expressTracking.update({
    where: { id: data.id },
    data: {
      companyCode: r.companyName,
      lastState: r.state,
      tracesJson: r.traces as unknown as Prisma.InputJsonValue,
      lastUpdateAt: new Date()
    }
  });

  await audit({
    userId: session.user.id,
    action: "EXPRESS_REFRESH",
    targetType: "ExpressTracking",
    targetId: data.id,
    detail: { state: r.state, provider: r.provider }
  });

  revalidatePath("/express");
  if (e.matterId) await revalidateMatter(e.matterId);
  return { ok: true, state: r.state, provider: r.provider, traces: r.traces };
}

export async function deleteExpress(input: z.infer<typeof expressIdSchema>) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const data = expressIdSchema.parse(input);

  const e = await assertCanAccessExpressRecord(session.user.id, data.id);

  await prisma.expressTracking.delete({ where: { id: data.id } });

  await audit({
    userId: session.user.id,
    action: "EXPRESS_DELETE",
    targetType: "ExpressTracking",
    targetId: data.id
  });

  revalidatePath("/express");
  if (e.matterId) await revalidateMatter(e.matterId);
  return { ok: true };
}

// Configuración (solo ADMIN)

async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("Solo el administrador puede modificar la configuración de envíos");
  }
  return session;
}

export async function getExpressSettingsPublic() {
  const prisma = await getTenantPrisma();
  await requireAdmin();
  return readPublicExpressSettings();
}

export async function saveExpressSettingsAction(input: z.infer<typeof expressSettingsSaveSchema>) {
  const prisma = await getTenantPrisma();
  const session = await requireAdmin();
  const data = expressSettingsSaveSchema.parse(input);

  await saveSettings({
    kdniaoEbusinessId: data.kdniaoEbusinessId?.trim() || undefined,
    kdniaoAppKey: data.kdniaoAppKey?.trim() || undefined,
    kdniaoClearKey: data.kdniaoClearKey,
    kuaidi100Customer: data.kuaidi100Customer?.trim() || undefined,
    kuaidi100Key: data.kuaidi100Key?.trim() || undefined,
    kuaidi100ClearKey: data.kuaidi100ClearKey
  });

  await audit({
    userId: session.user.id,
    action: "EXPRESS_SETTINGS_SAVE",
    targetType: "SystemSetting",
    targetId: "expressSettings"
  });

  return { ok: true };
}