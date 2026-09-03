/**
 * v0.20: å¾‹æ‰€æŠ¥è¡¨æ•°æ®èšåˆï¼ˆçº¯ read-onlyï¼Œæ—  use serverï¼‰
 *
 * 4 ä¸ªå£å¾„ï¼ˆæ¥è‡ª PRD åŽç»­è§„åˆ’ï¼‰ï¼š
 *  - Casoé‡ï¼šæœ¬æœŸæ–°æ”¶ / åœ¨åŠž / å·²Cerrar caso / å·²å½’æ¡£
 *  - ç±»åˆ«åˆ†å¸ƒï¼šæŒ‰ MatterCategory
 *  - Abogadoäº§å‡ºï¼šæ¯ä¸ªAbogadoæ‰¿åŠžCasoæ•° / å·²Cerrar casoæ•° / æ”¶æ¬¾Monto
 *  - Clienteåº”æ”¶ï¼šæŒ‰Clienteèšåˆ åº”æ”¶ - å·²æ”¶
 *
 * æ—¶é—´èŒƒå›´ï¼šè°ƒç”¨æ–¹ä¼  [start, end]ï¼ŒæŒ‰ Matter.createdAt è½å…¥æœ¬æœŸä¸ºã€Œæ–°æ”¶ã€ã€‚
 */
import { prisma } from "@/lib/prisma";
import type { MatterCategory } from "@prisma/client";

export type ReportPeriod = {
  label: string;
  start: Date;
  end: Date;
};

export function periodPresets(now = new Date()): Record<"month" | "quarter" | "year" | "lastYear", ReportPeriod> {
  const y = now.getFullYear();
  const m = now.getMonth();
  const q = Math.floor(m / 3);
  return {
    month: {
      label: `${y} å¹´ ${m + 1} æœˆ`,
      start: new Date(y, m, 1),
      end: new Date(y, m + 1, 1)
    },
    quarter: {
      label: `${y} å¹´ Q${q + 1}`,
      start: new Date(y, q * 3, 1),
      end: new Date(y, q * 3 + 3, 1)
    },
    year: {
      label: `${y} å¹´åº¦`,
      start: new Date(y, 0, 1),
      end: new Date(y + 1, 0, 1)
    },
    lastYear: {
      label: `${y - 1} å¹´åº¦`,
      start: new Date(y - 1, 0, 1),
      end: new Date(y, 0, 1)
    }
  };
}

/**
 * è§£æžè‡ªå®šä¹‰æ—¶é—´èŒƒå›´ï¼ˆå« startï¼Œä¸å« endï¼ŒåŠå¼€åŒºé—´ï¼‰ã€‚
 * - start/end å¿…é¡» yyyy-MM-ddï¼Œå¦åˆ™æŠ›é”™
 * - end > start
 * - è·¨åº¦ â‰¤ 5 å¹´ï¼ˆé˜²æ­¢è¯¯è¾“å…¥å¹´ä»½å¯¼è‡´å…¨åº“æ‰«æï¼‰
 */
export function customPeriod(startStr: string, endStr: string): ReportPeriod {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(startStr) || !re.test(endStr)) {
    throw new Error("Fechaæ ¼å¼ä¸åˆæ³•ï¼Œéœ€è¦ yyyy-MM-dd");
  }
  const [sy, sm, sd] = startStr.split("-").map(Number);
  const [ey, em, ed] = endStr.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  // end è§£é‡Šä¸º"å«å½“dÃ­as"ï¼Œè½¬åŠå¼€åŒºé—´éœ€ +1 dÃ­as
  const end = new Date(ey, em - 1, ed + 1);
  if (end.getTime() <= start.getTime()) {
    throw new Error("ç»“æŸFechaå¿…é¡»æ™šäºŽèµ·å§‹Fecha");
  }
  const days = (end.getTime() - start.getTime()) / 86400_000;
  if (days > 5 * 366) {
    throw new Error("è‡ªå®šä¹‰è·¨åº¦ä¸èƒ½è¶…è¿‡ 5 å¹´");
  }
  return {
    label: `${startStr} ~ ${endStr}`,
    start,
    end
  };
}

export type ReportKpis = {
  newIntake: number;
  inProgress: number;
  closed: number;
  archived: number;
  archiveRate: number; // å·²å½’æ¡£ / å·²Cerrar casoï¼›0 æ—¶Volver 0
};

export type CategoryBreakdown = {
  category: MatterCategory;
  count: number;
};

export type LawyerOutput = {
  userId: string;
  name: string;
  ownedCount: number; // owner = userId çš„Casoæ•°
  closedCount: number;
  receivedAmount: number; // æ”¶æ¬¾Monto
};

export type ClientReceivable = {
  clientId: string;
  name: string;
  receivable: number;
  received: number;
  balance: number;
};

export type ReportData = {
  period: ReportPeriod;
  kpis: ReportKpis;
  byCategory: CategoryBreakdown[];
  byLawyer: LawyerOutput[];
  byClientReceivable: ClientReceivable[];
};

export async function getReportData(period: ReportPeriod): Promise<ReportData> {
  // KPI 1: æœ¬æœŸæ–°æ”¶ï¼ˆcreatedAt è½å…¥æœ¬æœŸï¼‰
  const newIntake = await prisma.matter.count({
    where: {
      createdAt: { gte: period.start, lt: period.end },
      deletedAt: null
    }
  });

  // KPI 2: åœ¨åŠžï¼ˆstatus = IN_PROGRESSï¼Œä¸è®ºä½•æ—¶å»ºçš„ï¼‰
  const inProgress = await prisma.matter.count({
    where: { status: "IN_PROGRESS", deletedAt: null }
  });

  // KPI 3: æœ¬æœŸå·²ç»“ï¼ˆclosedAt è½å…¥æœ¬æœŸï¼‰
  const closed = await prisma.matter.count({
    where: {
      closedAt: { gte: period.start, lt: period.end },
      deletedAt: null
    }
  });

  // KPI 4: æœ¬æœŸå·²å½’æ¡£ï¼ˆarchivedAt è½å…¥æœ¬æœŸï¼‰
  const archived = await prisma.matter.count({
    where: {
      archivedAt: { gte: period.start, lt: period.end },
      deletedAt: null
    }
  });

  const archiveRate = closed > 0 ? archived / closed : 0;

  // ç±»åˆ«åˆ†å¸ƒï¼ˆæŒ‰æœ¬æœŸæ–°æ”¶çš„Casoåˆ†ç±»ï¼‰
  const cats = await prisma.matter.groupBy({
    by: ["category"],
    where: {
      createdAt: { gte: period.start, lt: period.end },
      deletedAt: null
    },
    _count: { _all: true }
  });
  const byCategory: CategoryBreakdown[] = cats.map((c) => ({
    category: c.category,
    count: c._count._all
  }));

  // Abogadoäº§å‡ºï¼ˆæŒ‰ owner èšåˆï¼Œæœ¬æœŸæ–°æ”¶ + æœ¬æœŸå·²ç»“ + æœ¬æœŸæ”¶æ¬¾ï¼‰
  const lawyerOwnedRaw = await prisma.matter.groupBy({
    by: ["ownerId"],
    where: {
      createdAt: { gte: period.start, lt: period.end },
      deletedAt: null
    },
    _count: { _all: true }
  });
  const lawyerClosedRaw = await prisma.matter.groupBy({
    by: ["ownerId"],
    where: {
      closedAt: { gte: period.start, lt: period.end },
      deletedAt: null
    },
    _count: { _all: true }
  });

  // Abogadoæœ¬æœŸæ”¶æ¬¾ï¼šFeeEntry.type=RECEIVED + occurredAt åœ¨æœ¬æœŸ + matter.ownerId
  const feeReceivedRaw = await prisma.feeEntry.findMany({
    where: {
      type: "RECEIVED",
      occurredAt: { gte: period.start, lt: period.end }
    },
    select: { amount: true, matter: { select: { ownerId: true } } }
  });
  const receivedByOwner = new Map<string, number>();
  for (const f of feeReceivedRaw) {
    const oid = f.matter?.ownerId;
    if (!oid) continue;
    receivedByOwner.set(oid, (receivedByOwner.get(oid) ?? 0) + Number(f.amount));
  }

  const userIds = new Set<string>();
  for (const r of lawyerOwnedRaw) userIds.add(r.ownerId);
  for (const r of lawyerClosedRaw) userIds.add(r.ownerId);
  for (const id of receivedByOwner.keys()) userIds.add(id);
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: { id: true, name: true }
  });
  const userNameById = new Map(users.map((u) => [u.id, u.name]));
  const ownedByOwner = new Map(lawyerOwnedRaw.map((r) => [r.ownerId, r._count._all]));
  const closedByOwner = new Map(lawyerClosedRaw.map((r) => [r.ownerId, r._count._all]));

  const byLawyer: LawyerOutput[] = Array.from(userIds)
    .map((uid) => ({
      userId: uid,
      name: userNameById.get(uid) ?? uid,
      ownedCount: ownedByOwner.get(uid) ?? 0,
      closedCount: closedByOwner.get(uid) ?? 0,
      receivedAmount: receivedByOwner.get(uid) ?? 0
    }))
    .sort((a, b) => b.receivedAmount - a.receivedAmount || b.ownedCount - a.ownedCount);

  // Clienteåº”æ”¶ï¼šFeeEntry RECEIVABLE / RECEIVED æŒ‰ matter.primaryClient èšåˆ
  const fees = await prisma.feeEntry.findMany({
    where: {
      type: { in: ["RECEIVABLE", "RECEIVED"] },
      occurredAt: { gte: period.start, lt: period.end }
    },
    select: {
      type: true,
      amount: true,
      matter: { select: { primaryClient: { select: { id: true, name: true } } } }
    }
  });
  const byClient = new Map<string, ClientReceivable>();
  for (const f of fees) {
    const c = f.matter?.primaryClient;
    if (!c) continue;
    if (!byClient.has(c.id)) {
      byClient.set(c.id, {
        clientId: c.id,
        name: c.name,
        receivable: 0,
        received: 0,
        balance: 0
      });
    }
    const row = byClient.get(c.id)!;
    if (f.type === "RECEIVABLE") row.receivable += Number(f.amount);
    if (f.type === "RECEIVED") row.received += Number(f.amount);
  }
  for (const row of byClient.values()) row.balance = row.receivable - row.received;
  const byClientReceivable = Array.from(byClient.values()).sort(
    (a, b) => b.balance - a.balance
  );

  return {
    period,
    kpis: { newIntake, inProgress, closed, archived, archiveRate },
    byCategory,
    byLawyer,
    byClientReceivable
  };
}


