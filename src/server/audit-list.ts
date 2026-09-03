"use server";

/**
 * v0.22: AuditLog æŸ¥è¯¢ï¼ˆadmin-only å®¡è®¡å›žæ”¾ï¼‰
 */
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";

export type AuditFilter = {
  userId?: string;
  action?: string;
  targetType?: string;
  startStr?: string; // yyyy-MM-dd
  endStr?: string;
  limit?: number;
  cursor?: string; // ä¸Šä¸€é¡µæœ€åŽä¸€æ¡ id
};

export type AuditEntry = {
  id: string;
  createdAt: Date;
  action: string;
  targetType: string | null;
  targetId: string | null;
  detail: unknown;
  ip: string | null;
  user: { id: string; name: string } | null;
};

export type AuditListResult = {
  items: AuditEntry[];
  nextCursor: string | null;
};

async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("ä»…Administrarå‘˜ / ä¸»ä»»Abogadoå¯è®¿é—®å®¡è®¡æ—¥å¿—");
  }
  return session;
}

function parseDate(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export async function listAuditLogs(filter: AuditFilter): Promise<AuditListResult> {
  await requireAdmin();
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200);

  const where: Record<string, unknown> = {};
  if (filter.userId) where.userId = filter.userId;
  if (filter.action) where.action = filter.action;
  if (filter.targetType) where.targetType = filter.targetType;

  const start = parseDate(filter.startStr);
  const end = parseDate(filter.endStr);
  if (start || end) {
    const range: Record<string, Date> = {};
    if (start) range.gte = start;
    if (end) {
      const exclusiveEnd = new Date(end);
      exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
      range.lt = exclusiveEnd;
    }
    where.createdAt = range;
  }

  const items = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      createdAt: true,
      action: true,
      targetType: true,
      targetId: true,
      detail: true,
      ip: true,
      user: { select: { id: true, name: true } }
    }
  });

  const hasMore = items.length > limit;
  const trimmed = hasMore ? items.slice(0, limit) : items;
  return {
    items: trimmed,
    nextCursor: hasMore ? trimmed[trimmed.length - 1].id : null
  };
}

/**
 * æ‹‰æ‰€æœ‰å‡ºçŽ°è¿‡çš„ action / targetType / userï¼Œç”¨äºŽå‰ç«¯ç­›é€‰ä¸‹æ‹‰ã€‚
 * ç›´æŽ¥ distinct æŸ¥è¯¢ï¼Œç»“æžœæ•°æœ‰é™ï¼ˆä¸šåŠ¡é‡Œ action ç±»åž‹æœ‰é™ï¼‰ã€‚
 */
export async function getAuditFilterOptions(): Promise<{
  actions: string[];
  targetTypes: string[];
  users: { id: string; name: string }[];
}> {
  await requireAdmin();
  const [actionsRaw, targetsRaw, users] = await Promise.all([
    prisma.auditLog.findMany({
      select: { action: true },
      distinct: ["action"],
      take: 200
    }),
    prisma.auditLog.findMany({
      where: { targetType: { not: null } },
      select: { targetType: true },
      distinct: ["targetType"],
      take: 100
    }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    })
  ]);
  return {
    actions: actionsRaw.map((r) => r.action).sort(),
    targetTypes: targetsRaw.map((r) => r.targetType!).sort(),
    users
  };
}


