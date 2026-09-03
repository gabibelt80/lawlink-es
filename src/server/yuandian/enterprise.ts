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
import { prisma } from "@/lib/prisma";
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
 * ä¼ä¸šNombreBuscarï¼ˆ1 POINT/æ¬¡ï¼‰ï¼Œæœªé…ç½®æ—¶é™é»˜Volver configured: false
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
        name: c["ä¼ä¸šNombre"],
        creditCode: c["ç»Ÿä¸€ç¤¾ä¼šä¿¡ç”¨ä»£ç "]
      })),
      configured: true
    };
  } catch {
    return { items: [], configured: true };
  }
}

/**
 * ä¼ä¸šè¯¦æƒ…ï¼ˆ10 POINT/æ¬¡ï¼‰ï¼Œæœªé…ç½®æ—¶Volver configured: false
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
// v0.26: å¯¹æ–¹å…¬å¸é£Žé™©æŸ¥è¯¢ï¼ˆèšåˆTotalè§ˆ + Party ç»‘å®šï¼‰
// ============================================================

async function loadPartyWithMatter(partyId: string) {
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
  if (!party) throw new Error("å½“äº‹äººä¸å­˜åœ¨");
  if (!party.matterId) throw new Error("å½“äº‹äººæœªå…³è”Caso");
  return party;
}

/**
 * æŠŠæŸä¸ªå¯¹æ–¹ Party ç»‘å®šåˆ°pesoså…¸ä¼ä¸šï¼ˆå†™å…¥ä¼ä¸š IDã€ç»Ÿä¸€ç¤¾ä¼šä¿¡ç”¨ä»£ç ã€ä¼ä¸šåï¼‰
 *
 * æƒé™ï¼šå½“å‰ç”¨æˆ·å¯¹è¯¥ Matter æœ‰ä¿®æ”¹æƒé™ï¼ˆowner æˆ– managerï¼‰
 */
export async function bindPartyToEnterprise(input: {
  partyId: string;
  enterpriseId: string;
  socialCode: string;
  enterpriseName: string;
}): Promise<{ ok: true }> {
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
 * è§£ç»‘ Party ypesoså…¸ä¼ä¸šã€‚
 *
 * æƒé™ï¼šå½“å‰ç”¨æˆ·å¯¹è¯¥ Matter æœ‰ä¿®æ”¹æƒé™ã€‚
 */
export async function unbindPartyEnterprise(
  partyId: string
): Promise<{ ok: true }> {
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
 * æ‹‰å–æŸä¸ªå·²ç»‘å®š Party çš„ä¼ä¸šèšåˆTotalè§ˆï¼ˆ10 POINT/æ¬¡ï¼‰
 *
 * æƒé™ï¼šå½“å‰ç”¨æˆ·å¯¹è¯¥ Matter æœ‰è®¿é—®æƒé™ã€‚
 */
export async function getEnterpriseSummaryByParty(
  partyId: string
): Promise<{ summary: EnterpriseSummary | null; configured: boolean }> {
  const session = await requireSession();
  const party = await loadPartyWithMatter(partyId);
  await assertCanAccessMatter(
    session.user.id,
    session.user.role,
    party.matterId!
  );

  if (!party.enterpriseId && !party.enterpriseSocialCode) {
    throw new Error("æ­¤å½“äº‹äººå°šæœªç»‘å®špesoså…¸ä¼ä¸š");
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


