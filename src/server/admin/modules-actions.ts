"use server";

import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { MODULES, ModuleKey } from "@/lib/modules";
import { revalidatePath } from "next/cache";

/**
 * Módulos del sistema — server actions del super admin.
 *
 * Distingue dos tipos:
 *   - base: activables por estudio, sin cobro
 *   - premium: contratables por estudio, con precio propio
 */

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export type ModuleConfigRow = {
  key: string;
  label: string;
  description: string | null;
  price: number;
  premium: boolean;
  enabled: boolean;
  sortOrder: number;
};

/**
 * Devuelve el catálogo completo de módulos. Si no hay registros en BD,
 * los crea inicialmente con los valores de `MODULES` (todos base, precio 0).
 */
export async function listModulesAction(): Promise<ModuleConfigRow[]> {
  const session = await requireSession();
  if (session.user.role !== "SYSTEM_ADMIN") {
    throw new Error("Solo el administrador del sistema puede ver los módulos");
  }

  const rows = await prisma.moduleConfig.findMany({ orderBy: { sortOrder: "asc" } });

  if (rows.length === 0) {
    // Inicializar catálogo desde MODULES
    const moduleKeys = Object.keys(MODULES) as ModuleKey[];
    const premiums: ModuleKey[] = ["JURISPRUDENCE", "IA"];
    const initialPrices: Partial<Record<ModuleKey, number>> = {
      JURISPRUDENCE: 9900,
      IA: 14900,
    };

    await prisma.moduleConfig.createMany({
      data: moduleKeys.map((key, i) => ({
        key,
        label: MODULES[key].label,
        description: MODULES[key].description,
        price: initialPrices[key] ?? 0,
        premium: premiums.includes(key),
        enabled: true,
        sortOrder: i,
      })),
      skipDuplicates: true,
    });

    return (await prisma.moduleConfig.findMany({ orderBy: { sortOrder: "asc" } })).map((r) => ({
      key: r.key,
      label: r.label,
      description: r.description,
      price: Number(r.price),
      premium: r.premium,
      enabled: r.enabled,
      sortOrder: r.sortOrder,
    }));
  }

  return rows.map((r) => ({
    key: r.key,
    label: r.label,
    description: r.description,
    price: Number(r.price),
    premium: r.premium,
    enabled: r.enabled,
    sortOrder: r.sortOrder,
  }));
}

const updateModuleSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  description: z.string().nullable(),
  price: z.number().min(0),
  premium: z.boolean(),
  enabled: z.boolean(),
  sortOrder: z.number().int(),
});

export async function updateModuleAction(input: z.infer<typeof updateModuleSchema>) {
  const session = await requireSession();
  if (session.user.role !== "SYSTEM_ADMIN") {
    throw new Error("Solo el administrador del sistema puede editar módulos");
  }

  const data = updateModuleSchema.parse(input);

  await prisma.moduleConfig.update({
    where: { key: data.key },
    data: {
      label: data.label,
      description: data.description,
      price: data.price,
      premium: data.premium,
      enabled: data.enabled,
      sortOrder: data.sortOrder,
    },
  });

  revalidatePath("/admin/modules");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Estudios y sus módulos
// ---------------------------------------------------------------------------

export type FirmWithModules = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  enabledBaseModules: string[];
  premiumSubscriptions: {
    moduleKey: string;
    active: boolean;
    autoRenew: boolean;
    status: string;
    currentPeriodEnd: string | null;
  }[];
};

export async function listFirmsWithModulesAction(query?: string): Promise<FirmWithModules[]> {
  const session = await requireSession();
  if (session.user.role !== "SYSTEM_ADMIN") {
    throw new Error("Solo el administrador del sistema puede ver estudios");
  }

  const where = query?.trim()
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { slug: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const firms = await prisma.firm.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      enabledBaseModules: true,
      moduleSubscriptions: {
        select: {
          moduleKey: true,
          active: true,
          autoRenew: true,
          status: true,
          currentPeriodEnd: true,
        },
      },
    },
  });

  return firms.map((f) => ({
    id: f.id,
    name: f.name,
    slug: f.slug,
    plan: f.plan,
    enabledBaseModules: Array.isArray(f.enabledBaseModules)
      ? (f.enabledBaseModules as string[])
      : [],
    premiumSubscriptions: f.moduleSubscriptions.map((s) => ({
      moduleKey: s.moduleKey,
      active: s.active,
      autoRenew: s.autoRenew,
      status: s.status,
      currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
    })),
  }));
}

const setBaseModulesSchema = z.object({
  firmId: z.string().min(1),
  enabled: z.array(z.string()),
});

export async function setFirmBaseModulesAction(input: z.infer<typeof setBaseModulesSchema>) {
  const session = await requireSession();
  if (session.user.role !== "SYSTEM_ADMIN") {
    throw new Error("Solo el administrador del sistema puede editar módulos del estudio");
  }

  const data = setBaseModulesSchema.parse(input);

  const valid = data.enabled.filter((k) => Object.keys(MODULES).includes(k));

  await prisma.firm.update({
    where: { id: data.firmId },
    data: { enabledBaseModules: valid },
  });

  revalidatePath("/admin/modules");
  return { ok: true };
}

const togglePremiumSchema = z.object({
  firmId: z.string().min(1),
  moduleKey: z.string().min(1),
  active: z.boolean(),
});

/**
 * Activa o desactiva manualmente un módulo premium para un estudio.
 * El super admin puede override sin cobro (útil para cortesías).
 */
export async function setFirmPremiumModuleAction(input: z.infer<typeof togglePremiumSchema>) {
  const session = await requireSession();
  if (session.user.role !== "SYSTEM_ADMIN") {
    throw new Error("Solo el administrador del sistema puede editar módulos del estudio");
  }

  const data = togglePremiumSchema.parse(input);

  if (!Object.keys(MODULES).includes(data.moduleKey)) {
    throw new Error("Módulo inválido");
  }

  await prisma.firmModuleSubscription.upsert({
    where: { firmId_moduleKey: { firmId: data.firmId, moduleKey: data.moduleKey } },
    update: {
      active: data.active,
      status: data.active ? "active" : "suspended",
    },
    create: {
      firmId: data.firmId,
      moduleKey: data.moduleKey,
      active: data.active,
      autoRenew: false,
      status: data.active ? "active" : "suspended",
    },
  });

  revalidatePath("/admin/modules");
  return { ok: true };
}