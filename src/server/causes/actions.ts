"use server";

import type { MatterCategory, Prisma, ProcedureType } from "@prisma/client";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { causeScopeForSelection } from "@/lib/cause-scope";

const CAUSE_SELECT = {
  id: true,
  code: true,
  name: true,
  shortName: true,
  level: true,
  parentId: true,
  parent: {
    select: {
      id: true,
      name: true,
      level: true,
      parent: { select: { id: true, name: true, level: true } }
    }
  }
} as const;

export type CauseSearchResult = {
  id: string;
  code: string | null;
  name: string;
  shortName: string | null;
  level: number;
  parentId: string | null;
  l2Name: string | null;
  l1Name: string | null;
};

function flatten(c: {
  id: string;
  code: string | null;
  name: string;
  shortName: string | null;
  level: number;
  parentId: string | null;
  parent: {
    id: string;
    name: string;
    level: number;
    parent: { id: string; name: string; level: number } | null;
  } | null;
}): CauseSearchResult {
  const chain: { name: string; level: number }[] = [{ name: c.name, level: c.level }];
  if (c.parent) chain.push({ name: c.parent.name, level: c.parent.level });
  if (c.parent?.parent) chain.push({ name: c.parent.parent.name, level: c.parent.parent.level });
  const l1 = chain.find((x) => x.level === 1)?.name ?? null;
  const l2 = chain.find((x) => x.level === 2)?.name ?? null;
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    shortName: c.shortName,
    level: c.level,
    parentId: c.parentId,
    l1Name: l1,
    l2Name: l2
  };
}

function codeFilter(prefixes: readonly string[]): Prisma.CauseOfActionWhereInput {
  return {
    OR: prefixes.flatMap((p) => [
      { code: p },
      { code: { startsWith: `${p}-` } }
    ])
  };
}

export async function searchCauses(params: {
  category: MatterCategory;
  procedureType?: ProcedureType | null;
  query?: string;
  limit?: number;
}): Promise<CauseSearchResult[]> {
  await requireSession();
  const prisma = await getTenantPrisma();
  const limit = Math.min(params.limit ?? 50, 2000);
  const q = params.query?.trim();
  const scope = causeScopeForSelection(params.category, params.procedureType);
  const scopedWhere: Prisma.CauseOfActionWhereInput = {
    ...(scope.includeCodePrefixes ? codeFilter(scope.includeCodePrefixes) : {}),
    ...(scope.excludeCodePrefixes.length > 0 ? { NOT: codeFilter(scope.excludeCodePrefixes) } : {})
  };

  if (!q) {
    const list = await prisma.causeOfAction.findMany({
      where: {
        category: scope.dbCategory,
        active: true,
        ...scopedWhere
      },
      orderBy: [{ level: "asc" }, { code: "asc" }],
      take: limit,
      select: CAUSE_SELECT
    });
    return list.map(flatten);
  }

  const list = await prisma.causeOfAction.findMany({
    where: {
      category: scope.dbCategory,
      active: true,
      level: { gte: 2 },
      AND: [
        scopedWhere,
        {
          OR: [
            { name: { contains: q } },
            { shortName: { contains: q } },
            { keywords: { array_contains: q } },
            { pinyin: { contains: q } }
          ]
        }
      ]
    },
    orderBy: [{ level: "asc" }, { code: "asc" }],
    take: limit,
    select: CAUSE_SELECT
  });
  return list.map(flatten);
}

export async function getCauseById(id: string) {
  const prisma = await getTenantPrisma();
  await requireSession();
  const c = await prisma.causeOfAction.findUnique({
    where: { id },
    select: { ...CAUSE_SELECT, category: true }
  });
  if (!c) return null;
  return { ...flatten(c), category: c.category };
}

export async function listCauseL2(category: MatterCategory) {
  const prisma = await getTenantPrisma();
  await requireSession();
  return prisma.causeOfAction.findMany({
    where: { category, active: true, level: 2 },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, parentId: true }
  });
}

