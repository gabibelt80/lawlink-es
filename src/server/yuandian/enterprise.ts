"use server";

import { requireSession } from "@/lib/auth/session";
import { getYuandianSettings } from "@/lib/yuandian/settings";
import {
  searchEnterpriseCandidates as clientSearch,
  getEnterpriseBaseInfo as clientDetail,
  getEnterpriseSummary as clientSummary,
  type MappedEnterpriseInfo,
  type EnterpriseSummary
} from "@/lib/yuandian/enterprise";
import { audit } from "@/server/audit";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import {
  assertCanAccessMatter,
  assertCanModifyMatter
} from "@/lib/permissions";
import { revalidateMatter } from "@/server/matters/route";

export type EnterpriseSearchItem = {
  id: string;
  name: string;
  creditCode: string;
};

/**
 * Búsqueda de empresas por nombre (1 POINT por consulta).
 * Devuelve configured: false si no está configurado.
 */
export async function searchEnterpriseCandidates(
  name: string
): Promise<{ items: EnterpriseSearchItem[]; configured: boolean }> {
  const session = await requireSession();
  const settings = await getYuandianSettings();
  if (!settings.configured) return { items: [], configured: false };

  try {
    const candidates = await clientSearch(name, 10, settings);

    await audit({
      userId: session.user.id,
      action: "YUANDIAN_ENTERPRISE_SEARCH",
      targetType: "SystemSetting",
      targetId: "yuandianSettings",
      detail: { query: name, hits: candidates.length }
    });

    return {
      items: candidates.map((c) => ({
        id: c.id,
        name: c.name,
        creditCode: c.creditCode
      })),
      configured: true
    };
  } catch {
    return { items: [], configured: true };
  }
}

/**
 * Detalle de empresa (10 POINT por consulta).
 * Devuelve configured: false si no está configurado.
 */
export async function getEnterpriseDetail(
  id: string
): Promise<{ info: MappedEnterpriseInfo | null; configured: boolean }> {
  const session = await requireSession();
  const settings = await getYuandianSettings();
  if (!settings.configured) return { info: null, configured: false };

  const info = await clientDetail(id, settings);

  await audit({
    userId: session.user.id,
    action: "YUANDIAN_ENTERPRISE_DETAIL",
    targetType: "SystemSetting",
    targetId: "yuandianSettings",
    detail: { enterpriseId: id, name: info?.name, found: !!info }
  });

  return { info, configured: true };
}

// ============================================================
// v0.26: Consulta de riesgo de contraparte + vinculación con Party
// ============================================================

async function loadPartyWithMatter(partyId: string) {
  const prisma = await getTenantPrisma();
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: {
      id: true,
      name: true,
      role: true,
      matterId: true,
      enterpriseId: true,
      enterpriseSocialCode: true,
      enterpriseName: true,
      enterpriseBoundAt: true
    }
  });
  if (!party) throw new Error("La parte no existe");
  if (!party.matterId) throw new Error("La parte no está asociada a un Caso");
  return party;
}

/**
 * Vincula una Party a una empresa (guarda ID, código social y nombre).
 * Permiso: el usuario actual tiene permiso de modificación sobre el Matter.
 */
export async function bindPartyToEnterprise(input: {
  partyId: string;
  enterpriseId: string;
  socialCode: string;
  enterpriseName: string;
}): Promise<{ ok: true }> {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const party = await loadPartyWithMatter(input.partyId);
  await assertCanModifyMatter(
    session.user.id,
    session.user.role,
    party.matterId!
  );

  await prisma.party.update({
    where: { id: party.id },
    data: {
      enterpriseId: input.enterpriseId,
      enterpriseSocialCode: input.socialCode,
      enterpriseName: input.enterpriseName,
      enterpriseBoundAt: new Date()
    }
  });

  await audit({
    userId: session.user.id,
    action: "YUANDIAN_ENTERPRISE_BIND",
    targetType: "Party",
    targetId: party.id,
    detail: {
      matterId: party.matterId,
      partyName: party.name,
      enterpriseId: input.enterpriseId,
      socialCode: input.socialCode,
      enterpriseName: input.enterpriseName
    }
  });

  await revalidateMatter(party.matterId);
  return { ok: true };
}

/**
 * Desvincula una Party de la empresa.
 * Permiso: el usuario actual tiene permiso de modificación sobre el Matter.
 */
export async function unbindPartyEnterprise(
  partyId: string
): Promise<{ ok: true }> {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const party = await loadPartyWithMatter(partyId);
  await assertCanModifyMatter(
    session.user.id,
    session.user.role,
    party.matterId!
  );

  await prisma.party.update({
    where: { id: partyId },
    data: {
      enterpriseId: null,
      enterpriseSocialCode: null,
      enterpriseName: null,
      enterpriseBoundAt: null
    }
  });

  await audit({
    userId: session.user.id,
    action: "YUANDIAN_ENTERPRISE_UNBIND",
    targetType: "Party",
    targetId: partyId,
    detail: { matterId: party.matterId, partyName: party.name }
  });

  await revalidateMatter(party.matterId);
  return { ok: true };
}

/**
 * Obtiene el resumen de una empresa vinculada a una Party (10 POINT por consulta).
 * Permiso: el usuario actual tiene permiso de acceso sobre el Matter.
 */
export async function getEnterpriseSummaryByParty(
  partyId: string
): Promise<{ summary: EnterpriseSummary | null; configured: boolean }> {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const party = await loadPartyWithMatter(partyId);
  await assertCanAccessMatter(
    session.user.id,
    session.user.role,
    party.matterId!
  );

  if (!party.enterpriseId && !party.enterpriseSocialCode) {
    throw new Error("Esta parte aún no está vinculada a una empresa");
  }

  const settings = await getYuandianSettings();
  if (!settings.configured) return { summary: null, configured: false };

  const summary = await clientSummary(
    { id: party.enterpriseId ?? undefined, socialCode: party.enterpriseSocialCode ?? undefined },
    settings
  );

  await audit({
    userId: session.user.id,
    action: "YUANDIAN_ENTERPRISE_SUMMARY",
    targetType: "Party",
    targetId: party.id,
    detail: {
      matterId: party.matterId,
      enterpriseId: party.enterpriseId,
      socialCode: party.enterpriseSocialCode,
      level: summary?.level,
      coreRiskTotals: summary?.coreRisks.reduce<Record<string, number>>(
        (acc, r) => {
          acc[r.category] = r.total;
          return acc;
        },
        {}
      )
    }
  });

  return { summary, configured: true };
}