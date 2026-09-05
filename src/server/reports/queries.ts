/**
 * v0.20: Reportes del bufete (solo lectura, sin use server)
 *
 * 4 bloques de datos:
 *  - KPIs: nuevos casos / en tramite / cerrados / archivados
 *  - Distribucion por categoria (MatterCategory)
 *  - Produccion por abogado: casos asignados / cerrados / cobros
 *  - Cuentas por cobrar por cliente: pendiente - cobrado
 *
 * Rango de tiempo: [start, end], segun Matter.createdAt para "nuevos casos".
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
      label: `${y} - Mes ${m + 1}`,
      start: new Date(y, m, 1),
      end: new Date(y, m + 1, 1)
    },
    quarter: {
      label: `${y} - Q${q + 1}`,
      start: new Date(y, q * 3, 1),
      end: new Date(y, q * 3 + 3, 1)
    },
    year: {
      label: `${y} - Anual`,
      start: new Date(y, 0, 1),
      end: new Date(y + 1, 0, 1)
    },
    lastYear: {
      label: `${y - 1} - Anual`,
      start: new Date(y - 1, 0, 1),
      end: new Date(y, 0, 1)
    }
  };
}

/**
 * Analiza rango personalizado (incluye start, excluye end, intervalo semiabierto).
 * - start/end deben ser yyyy-MM-dd, de lo contrario error
 * - end > start
 * - Rango maximo 5 anios (evita escaneo completo por error de tipeo)
 */
export function customPeriod(startStr: string, endStr: string): ReportPeriod {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(startStr) || !re.test(endStr)) {
    throw new Error("Formato de fecha invalido, se necesita yyyy-MM-dd");
  }
  const [sy, sm, sd] = startStr.split("-").map(Number);
  const [ey, em, ed] = endStr.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  // end se interpreta como "incluye el dia", para intervalo semiabierto se suma 1 dia
  const end = new Date(ey, em - 1, ed + 1);
  if (end.getTime() <= start.getTime()) {
    throw new Error("La fecha fin debe ser posterior a la fecha inicio");
  }
  const days = (end.getTime() - start.getTime()) / 86400_000;
  if (days > 5 * 366) {
    throw new Error("El rango personalizado no puede superar 5 anios");
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
  archiveRate: number; // archivados / cerrados; si es 0 devuelve 0
};

export type CategoryBreakdown = {
  category: MatterCategory;
  count: number;
};

export type LawyerOutput = {
  userId: string;
  name: string;
  ownedCount: number; // cantidad de casos donde owner = userId
  closedCount: number;
  receivedAmount: number; // monto cobrado
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
  // KPI 1: nuevos casos del periodo (createdAt dentro del periodo)
  const newIntake = await prisma.matter.count({
    where: {
      createdAt: { gte: period.start, lt: period.end },
      deletedAt: null
    }
  });

  // KPI 2: en tramite (status = IN_PROGRESS, sin importar fecha de creacion)
  const inProgress = await prisma.matter.count({
    where: { status: "IN_PROGRESS", deletedAt: null }
  });

  // KPI 3: cerrados en el periodo (closedAt dentro del periodo)
  const closed = await prisma.matter.count({
    where: {
      closedAt: { gte: period.start, lt: period.end },
      deletedAt: null
    }
  });

  // KPI 4: archivados en el periodo (archivedAt dentro del periodo)
  const archived = await prisma.matter.count({
    where: {
      archivedAt: { gte: period.start, lt: period.end },
      deletedAt: null
    }
  });

  const archiveRate = closed > 0 ? archived / closed : 0;

  // Distribucion por categoria (por casos nuevos del periodo)
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

  // Produccion por abogado (agrupado por owner, nuevos + cerrados + cobros del periodo)
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

  // Cobros del periodo por abogado: FeeEntry.type=RECEIVED + occurredAt en el periodo + matter.ownerId
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

  // Cuentas por cobrar por cliente: FeeEntry RECEIVABLE / RECEIVED agrupado por matter.primaryClient
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