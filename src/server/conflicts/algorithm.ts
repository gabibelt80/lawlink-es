/**
 * å†²çªæ£€ç´¢ç®—æ³•ï¼ˆV2ï¼‰
 *
 * y V1 çš„å…³é”®åŒºåˆ«ï¼š
 *   - V1 æŠŠ"Clienteåº“åŒå"ä¹Ÿå½“ä½œå†²çªå‘½ä¸­å¹¶æ ‡ HIGHï¼Œä¼šå‡ºçŽ°"è‡ªå·±è·Ÿè‡ªå·±å†²çª"
 *     çš„é”™è§‰ï¼ˆSistemaå·²æœ‰åŒåClienteæ¡£æ¡ˆ â‰  åˆ©ç›Šå†²çªï¼‰ã€‚
 *   - V2 ä¸¥æ ¼æŠŠ"åˆ©ç›Šå†²çª"å®šä¹‰ä¸ºï¼šå€™é€‰å½“äº‹äººåœ¨è¿‡åŽ» Matter é‡Œçš„Rolyæœ¬æ¬¡
 *     å€™é€‰Rolç»„åˆæž„æˆå†²çªã€‚å‘½ä¸­åªè½åœ¨ Matter ä¸Šï¼Œä¸è½åœ¨ Clientã€‚
 *   - åŒåClienteæ¡£æ¡ˆå•ç‹¬èµ° sameNameClients æç¤ºï¼Œä¸æŸ“è‰²ã€ä¸è®¡å…¥ hitsã€‚
 *   - èº«ä»½è¯å·ä¸€è‡´ â†’ å•ç‹¬èµ° idMatchedClientsï¼ˆå¼ºæç¤ºï¼Œå¯ç‚¹å¼€äººå·¥æ ¸å¯¹ï¼‰ã€‚
 *
 * ä¸¥é‡åº¦åˆ¤å®šï¼š
 *   å€™é€‰ CLIENT_PARTY  Ã—  åŽ†å² OPPOSING_PARTY  â†’ HIGH        æ›¾ç»çš„å¯¹æ‰‹çŽ°åœ¨è¦å˜å§”æ‰˜æ–¹
 *   å€™é€‰ OPPOSING_PARTY Ã— åŽ†å² CLIENT_PARTY    â†’ BLOCKING    æ‹Ÿä»£ç†çš„å¯¹æ–¹æ›¾æ˜¯æˆ‘æ‰€Cliente
 *   å€™é€‰ OPPOSING_PARTY Ã— åŽ†å² OPPOSING_PARTY  â†’ LOW         åŽ†å²äº¤é”‹æç¤ºï¼Œå¯ç»§ç»­åŠž
 *   å€™é€‰ CLIENT_PARTY  Ã—  åŽ†å² CLIENT_PARTY    â†’ LOW         ç†ŸClienteå¤åŠž
 *   å€™é€‰ THIRD_PARTY    Ã— ä»»ä½•                  â†’ MEDIUM
 *   èº«ä»½è¯ä¸€è‡´ â†’ åœ¨åŽŸä¸¥é‡åº¦åŸºç¡€ä¸Šå‡ 1 çº§ï¼ˆBLOCKING é¡¶dÃ­asï¼‰
 */

import type { Prisma, PartyRole, LitigationStanding, MatterCategory, MatterStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type QueryItem = {
  role: PartyRole;
  name: string;
  idNumber?: string;
};

export type MatterInfoForHit = {
  matterId: string;
  internalCode: string;
  title: string;
  category: MatterCategory;
  status: MatterStatus;
  intakeDate: Date | null;
  causeText: string | null;
  ownerName: string | null;
  partyRole: PartyRole;
  partyStanding: LitigationStanding | null;
};

const matterInfoSelect = {
  id: true,
  internalCode: true,
  title: true,
  category: true,
  status: true,
  intakeDate: true,
  cause: { select: { name: true } },
  causeFreeText: true,
  owner: { select: { name: true } }
} as const;

type SelectedMatterInfo = Prisma.MatterGetPayload<{ select: typeof matterInfoSelect }>;

function toMatterInfo(
  matter: SelectedMatterInfo,
  partyRole: PartyRole,
  partyStanding: LitigationStanding | null
): MatterInfoForHit {
  return {
    matterId: matter.id,
    internalCode: matter.internalCode,
    title: matter.title,
    category: matter.category,
    status: matter.status,
    intakeDate: matter.intakeDate,
    causeText: matter.cause?.name ?? matter.causeFreeText ?? null,
    ownerName: matter.owner?.name ?? null,
    partyRole,
    partyStanding
  };
}

export type ConflictHitDraft = {
  hitType: "HISTORICAL_PARTY";
  targetType: "Matter";
  targetId: string;
  matchedName: string;
  matchedField: "name" | "idNumber";
  matchedValue: string;
  matchedRatio: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "BLOCKING";
  reason: string;
  matterInfo: MatterInfoForHit;
};

export type SameNameClient = {
  clientId: string;
  name: string;
};

export type IdMatchedClient = {
  clientId: string;
  name: string;
  idNumber: string;
};

export type ConflictCheckResult = {
  hits: ConflictHitDraft[];
  sameNameClients: SameNameClient[];
  idMatchedClients: IdMatchedClient[];
};

const SEV_ORDER = { LOW: 0, MEDIUM: 1, HIGH: 2, BLOCKING: 3 } as const;
const SEV_BY_ORDER = ["LOW", "MEDIUM", "HIGH", "BLOCKING"] as const;

function bumpSeverity(s: ConflictHitDraft["severity"]): ConflictHitDraft["severity"] {
  return SEV_BY_ORDER[Math.min(SEV_ORDER[s] + 1, 3)];
}

function pickSeverity(
  candidateRole: PartyRole,
  historyRole: PartyRole
): ConflictHitDraft["severity"] {
  if (candidateRole === "THIRD_PARTY" || historyRole === "THIRD_PARTY") return "MEDIUM";
  if (candidateRole === "OPPOSING_PARTY" && historyRole === "CLIENT_PARTY") return "BLOCKING";
  if (candidateRole === "CLIENT_PARTY" && historyRole === "OPPOSING_PARTY") return "HIGH";
  if (candidateRole === "OPPOSING_PARTY" && historyRole === "OPPOSING_PARTY") return "LOW";
  if (candidateRole === "CLIENT_PARTY" && historyRole === "CLIENT_PARTY") return "LOW";
  return "MEDIUM";
}

export async function runConflictCheck(queries: QueryItem[]): Promise<ConflictCheckResult> {
  const hits: ConflictHitDraft[] = [];
  const sameNameClients = new Map<string, SameNameClient>();
  const idMatchedClients = new Map<string, IdMatchedClient>();

  for (const q of queries) {
    const name = q.name.trim();
    const idNumber = q.idNumber?.trim() || null;
    if (!name && !idNumber) continue;

    // v0.16: åŒå / è¯ä»¶å·CoincidenciaClienteæ¡£æ¡ˆä¸å†ä½œä¸ºå†²çªæç¤º
    //  (ç”¨æˆ·åé¦ˆï¼šyåˆ©ç›Šå†²çªæ£€ç´¢æ— å…³ï¼›ä¿ç•™ sameNameClients/idMatchedClients æ•°æ®
    //  ç»“æž„ä»¥å…¼å®¹åŽ†å² ConflictCheck è®°å½•ï¼Œä½†æ–°æ£€ç´¢æ—¶æ°¸è¿œä¸ºç©º)

    // ============ åŽ†å²Caso Party Coincidencia ============
    const partyWhere: Prisma.PartyWhereInput[] = [];
    if (name) partyWhere.push({ name });
    if (idNumber) partyWhere.push({ idNumber });
    if (partyWhere.length === 0) continue;

    const partiesExact = await prisma.party.findMany({
      where: {
        OR: partyWhere,
        matterId: { not: null },
        matter: { deletedAt: null }
      },
      select: {
        id: true,
        name: true,
        idNumber: true,
        role: true,
        standing: true,
        matter: {
          select: matterInfoSelect
        }
      }
    });

    for (const p of partiesExact) {
      if (!p.matter) continue;
      const matterInfo = toMatterInfo(p.matter, p.role, p.standing);

      // èº«ä»½è¯ä¸€è‡´ â†’ åœ¨åŸºç¡€ä¸¥é‡åº¦ä¸Šå‡ 1 çº§
      if (idNumber && p.idNumber && p.idNumber === idNumber) {
        const base = pickSeverity(q.role, p.role);
        const sev = bumpSeverity(base);
        hits.push({
          hitType: "HISTORICAL_PARTY",
          targetType: "Matter",
          targetId: p.matter.id,
          matchedName: p.name,
          matchedField: "idNumber",
          matchedValue: idNumber,
          matchedRatio: 1,
          severity: sev,
          reason: `èº«ä»½è¯ / ä¿¡ç”¨ä»£ç yCasoã€Œ${p.matter.internalCode}ã€ä¸­ ${roleLabel(p.role)}ã€Œ${p.name}ã€ä¸€è‡´`,
          matterInfo
        });
      }
      if (name && p.name === name) {
        const sev = pickSeverity(q.role, p.role);
        hits.push({
          hitType: "HISTORICAL_PARTY",
          targetType: "Matter",
          targetId: p.matter.id,
          matchedName: p.name,
          matchedField: "name",
          matchedValue: name,
          matchedRatio: 1,
          severity: sev,
          reason: `yCasoã€Œ${p.matter.internalCode}ã€ä¸­ ${roleLabel(p.role)}ã€Œ${p.name}ã€åŒå`,
          matterInfo
        });
      }
    }

    // Party Nombre y apellidoæ¨¡ç³ŠCoincidenciaï¼ˆé™ 3 å­—ç¬¦ä»¥ä¸Šï¼Œé¿å…å•å­—å¤§é‡è¯¯å‘½ä¸­ï¼‰
    if (name && name.length >= 3) {
      const partiesFuzzy = await prisma.party.findMany({
        where: {
          matterId: { not: null },
          matter: { deletedAt: null },
          name: { contains: name },
          NOT: { name }
        },
        select: {
          id: true,
          name: true,
          role: true,
          standing: true,
          matter: {
            select: matterInfoSelect
          }
        },
        take: 20
      });
      for (const p of partiesFuzzy) {
        if (!p.matter) continue;
        hits.push({
          hitType: "HISTORICAL_PARTY",
          targetType: "Matter",
          targetId: p.matter.id,
          matchedName: p.name,
          matchedField: "name",
          matchedValue: name,
          matchedRatio: name.length / p.name.length,
          severity: "LOW",
          reason: `yCasoã€Œ${p.matter.internalCode}ã€ä¸­ ${roleLabel(p.role)}ã€Œ${p.name}ã€Nombreç›¸ä¼¼`,
          matterInfo: toMatterInfo(p.matter, p.role, p.standing)
        });
      }
    }

    // ============ v0.43: Clienteæ¡£æ¡ˆ â†’ å…³è”Caso æ£€ç´¢ï¼ˆä¿®å¤æ¼æŠ¥ï¼‰============
    // è€Casoå¸¸åªåœ¨ Matter.primaryClient / clientLinks è®°Clienteã€Party è¡¨ä¸ºç©ºï¼Œ
    // ä¸Šé¢çš„ Party æ£€ç´¢ä¼šæ¼æŽ‰ã€‚Clienteä½œä¸ºæŸCasoçš„ã€Œå§”æ‰˜æ–¹(CLIENT_PARTY)ã€æ˜¯çœŸå®ž
    // å†²çªä¿¡å·ï¼Œæ•…æŒ‰Nombre/è¯ä»¶å·æŸ¥ Clientï¼Œå†å›žæº¯å…¶å…³è” Matter äº§å‡ºå‘½ä¸­ã€‚
    // ä¸æ»¤ statusï¼ˆå·²å½’æ¡£/è¿›è¡Œä¸­éƒ½è¦æç¤ºï¼‰ï¼›å­¤ç«‹Clienteæ¡£æ¡ˆï¼ˆæ— ä»»ä½•å…³è”Casoï¼‰ä¸äº§å‡ºå‘½ä¸­ã€‚
    const clientWhere: Prisma.ClientWhereInput[] = [];
    if (name) clientWhere.push({ name });
    if (idNumber) clientWhere.push({ idNumber });
    if (name && name.length >= 3) clientWhere.push({ name: { contains: name } });

    if (clientWhere.length > 0) {
      const clients = await prisma.client.findMany({
        where: { deletedAt: null, OR: clientWhere },
        select: {
          id: true,
          name: true,
          idNumber: true,
          matters: { where: { deletedAt: null }, select: matterInfoSelect },
          matterLinks: {
            where: { matter: { deletedAt: null } },
            select: { matter: { select: matterInfoSelect } }
          }
        }
      });

      for (const c of clients) {
        // è¯¥Clienteå…³è”çš„Ver todosCasoï¼ˆprimaryClient + clientLinksï¼‰ï¼ŒæŒ‰ id åŽ»é‡
        const matters = [...c.matters, ...c.matterLinks.map((l) => l.matter)].filter(
          (m, i, arr) => arr.findIndex((x) => x.id === m.id) === i
        );

        const idHit = !!(idNumber && c.idNumber && c.idNumber === idNumber);
        const nameExact = !!(name && c.name === name);
        const nameFuzzy = !!(name && !nameExact && name.length >= 3);

        for (const m of matters) {
          const matterInfo = toMatterInfo(m, "CLIENT_PARTY", null);

          if (idHit) {
            const sev = bumpSeverity(pickSeverity(q.role, "CLIENT_PARTY"));
            hits.push({
              hitType: "HISTORICAL_PARTY",
              targetType: "Matter",
              targetId: m.id,
              matchedName: c.name,
              matchedField: "idNumber",
              matchedValue: idNumber!,
              matchedRatio: 1,
              severity: sev,
              reason: `èº«ä»½è¯ / ä¿¡ç”¨ä»£ç yCasoã€Œ${m.internalCode}ã€çš„å§”æ‰˜æ–¹ã€Œ${c.name}ã€ä¸€è‡´`,
              matterInfo
            });
          }
          if (nameExact) {
            hits.push({
              hitType: "HISTORICAL_PARTY",
              targetType: "Matter",
              targetId: m.id,
              matchedName: c.name,
              matchedField: "name",
              matchedValue: name,
              matchedRatio: 1,
              severity: pickSeverity(q.role, "CLIENT_PARTY"),
              reason: `yCasoã€Œ${m.internalCode}ã€çš„å§”æ‰˜æ–¹ã€Œ${c.name}ã€åŒå`,
              matterInfo
            });
          } else if (nameFuzzy) {
            hits.push({
              hitType: "HISTORICAL_PARTY",
              targetType: "Matter",
              targetId: m.id,
              matchedName: c.name,
              matchedField: "name",
              matchedValue: name,
              matchedRatio: name.length / c.name.length,
              severity: "LOW",
              reason: `yCasoã€Œ${m.internalCode}ã€çš„å§”æ‰˜æ–¹ã€Œ${c.name}ã€Nombreç›¸ä¼¼`,
              matterInfo
            });
          }
        }
      }
    }
  }

  // åŽ»é‡ï¼šåŒä¸€ (targetId,matchedField,matchedValue) ä¿ç•™æœ€é«˜ä¸¥é‡åº¦
  const dedup = new Map<string, ConflictHitDraft>();
  for (const h of hits) {
    const key = `${h.targetId}|${h.matchedField}|${h.matchedValue}`;
    const existing = dedup.get(key);
    if (!existing || SEV_ORDER[h.severity] > SEV_ORDER[existing.severity]) {
      dedup.set(key, h);
    }
  }
  const sortedHits = Array.from(dedup.values()).sort(
    (a, b) => SEV_ORDER[b.severity] - SEV_ORDER[a.severity]
  );

  return {
    hits: sortedHits,
    sameNameClients: Array.from(sameNameClients.values()),
    idMatchedClients: Array.from(idMatchedClients.values())
  };
}

function roleLabel(role: PartyRole) {
  switch (role) {
    case "CLIENT_PARTY":
      return "å§”æ‰˜æ–¹";
    case "OPPOSING_PARTY":
      return "å¯¹æ–¹";
    case "THIRD_PARTY":
      return "ç¬¬ä¸‰äºº";
    case "CO_LITIGANT":
      return "å…±åŒè¯‰è®¼äºº";
    case "AGENT":
      return "ä»£ç†äºº";
    case "WITNESS":
      return "è¯äºº";
    default:
      return "å½“äº‹äºº";
  }
}


