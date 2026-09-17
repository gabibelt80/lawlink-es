"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";

const jurisprudenceSchema = z.object({
  title: z.string().max(300).optional(),
  summary: z.string().optional(),
  fullText: z.string().optional(),
  court: z.string().optional(),
  jurisdiction: z.string().optional(),
  fuero: z.string().optional(),
  date: z.string().optional(),
  source: z.string().optional(),
  sourceUrl: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export async function listJurisprudence() {
  const prisma = await getTenantPrisma();
  await requireSession();
  return prisma.jurisprudence.findMany({
    orderBy: { date: "desc" },
  });
}

export async function createJurisprudence(input: z.infer<typeof jurisprudenceSchema>) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();
  const data = jurisprudenceSchema.parse(input);
  
  const created = await prisma.jurisprudence.create({
    data: {
      ...data,
      title: data.title ?? "Sin título",
      fullText: data.fullText ?? "",
      date: data.date ? new Date(data.date) : null,
      createdById: session.user.id,
    },
  });
  
  revalidatePath("/jurisprudence");
  return { ok: true, id: created.id };
}

export async function deleteJurisprudence(id: string) {
  const prisma = await getTenantPrisma();
  await requireSession();
  await prisma.jurisprudence.delete({ where: { id } });
  revalidatePath("/jurisprudence");
  return { ok: true };
}
// ============================================================
// Funciones nuevas: filtros, editar, importar, exportar
// ============================================================

export async function listJurisprudenceFiltered(filters: {
  fuero?: string;
  jurisdiction?: string;
  category?: string;
  search?: string;
  yearFrom?: number;
  yearTo?: number;
  limit?: number;
}) {
  const prisma = await getTenantPrisma();
  await requireSession();

  const where: Record<string, unknown> = {};

  if (filters.fuero) where.fuero = filters.fuero;
  if (filters.jurisdiction) where.jurisdiction = filters.jurisdiction;
  if (filters.category) where.category = filters.category;

  if (filters.yearFrom || filters.yearTo) {
    where.date = {
      ...(filters.yearFrom ? { gte: new Date(filters.yearFrom, 0, 1) } : {}),
      ...(filters.yearTo ? { lte: new Date(filters.yearTo, 11, 31) } : {}),
    };
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { summary: { contains: filters.search, mode: "insensitive" } },
      { fullText: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return prisma.jurisprudence.findMany({
    where,
    orderBy: { date: "desc" },
    take: filters.limit ?? 100,
  });
}

export async function updateJurisprudence(
  id: string,
  input: z.infer<typeof jurisprudenceSchema>,
) {
  const prisma = await getTenantPrisma();
  await requireSession();
  const data = jurisprudenceSchema.parse(input);

  const updated = await prisma.jurisprudence.update({
    where: { id },
    data: {
      ...data,
      date: data.date ? new Date(data.date) : null,
    },
  });

  revalidatePath("/jurisprudence");
  return { ok: true, id: updated.id };
}

export async function importJurisprudenceBatch(
  items: z.infer<typeof jurisprudenceSchema>[],
) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();

  // Solo admin puede importar
  if (
    session.user.role !== "ADMIN" &&
    !session.user.isSystemAdmin
  ) {
    throw new Error("Solo el administrador puede importar jurisprudencia");
  }

  const parsed = items.map((item) => jurisprudenceSchema.parse(item));

  const created = await prisma.$transaction(
    parsed.map((data) =>
      prisma.jurisprudence.create({
        data: {
          ...data,
          title: data.title ?? "Sin título",
          fullText: data.fullText ?? "",
          date: data.date ? new Date(data.date) : null,
          createdById: session.user.id,
        },
      }),
    ),
  );

  revalidatePath("/jurisprudence");
  return { ok: true, count: created.length };
}

export async function exportJurisprudence() {
  const prisma = await getTenantPrisma();
  await requireSession();

  const items = await prisma.jurisprudence.findMany({
    orderBy: { date: "desc" },
  });

  return items;
}

export async function getJurisprudenceFilterOptions() {
  const prisma = await getTenantPrisma();
  await requireSession();

  const [fueros, jurisdictions, categories] = await Promise.all([
    prisma.jurisprudence.findMany({
      where: { fuero: { not: null } },
      select: { fuero: true },
      distinct: ["fuero"],
      orderBy: { fuero: "asc" },
    }),
    prisma.jurisprudence.findMany({
      where: { jurisdiction: { not: null } },
      select: { jurisdiction: true },
      distinct: ["jurisdiction"],
      orderBy: { jurisdiction: "asc" },
    }),
    prisma.jurisprudence.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
  ]);

  return {
    fueros: fueros.map((f) => f.fuero).filter(Boolean) as string[],
    jurisdictions: jurisdictions
      .map((j) => j.jurisdiction)
      .filter(Boolean) as string[],
    categories: categories
      .map((c) => c.category)
      .filter(Boolean) as string[],
  };
}

// ============================================================
// Ingesta desde SAIJ (Commit 3)
// Busca fallos en la API publica de SAIJ y los guarda en la DB.
// Respeta el patron multi-tenant y de auth del resto del archivo.
// ============================================================

const runAgentSchema = z.object({
  agentId: z.string().min(1),
  keywords: z.array(z.string()).min(1),
  pageSize: z.number().int().min(1).max(100).optional(),
});

export interface RunAgentResult {
  ok: boolean;
  saved: number;
  skipped: number;
  total: number;
  error?: string;
}

export async function runJurisprudenceAgent(input: {
  agentId: string;
  keywords: string[];
  pageSize?: number;
}): Promise<RunAgentResult> {
  const prisma = await getTenantPrisma();
  await requireSession();

  const parsed = runAgentSchema.parse(input);
  const { agentId, keywords, pageSize = 20 } = parsed;

  try {
    const { searchJurisprudencia } = await import("@/lib/saij/search");

    const termino = keywords[0];
    console.log(
      `[jurisprudence] Ejecutando agente ${agentId} con termino "${termino}"`
    );

    const result = await searchJurisprudencia({
      query: `titulo:${termino}`,
      pageSize,
      offset: 0,
    });

    let saved = 0;
    let skipped = 0;

    for (const item of result.items) {
      try {
        const existing = await prisma.jurisprudence.findUnique({
          where: { fingerprint: item.fingerprint },
          select: { id: true },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await prisma.jurisprudence.create({
          data: {
            title: item.title,
            summary: item.summary,
            fullText: item.fullText,
            court: item.court,
            jurisdiction: item.jurisdiction,
            fuero: item.fuero,
            date: item.date,
            source: item.source,
            sourceUrl: item.sourceUrl,
            sourceId: item.sourceId,
            category: item.category,
            tags: item.tags,
            fingerprint: item.fingerprint,
            hash: item.hash,
            status: item.status,
          },
        });
        saved++;
      } catch (err) {
        console.error("[jurisprudence] Error guardando item:", err);
        skipped++;
      }
    }

    revalidatePath("/jurisprudence");
    revalidatePath("/agents/jurisprudence");

    return {
      ok: true,
      saved,
      skipped,
      total: result.total,
    };
  } catch (error) {
    console.error("[jurisprudence] Error ejecutando agente:", error);
    return {
      ok: false,
      saved: 0,
      skipped: 0,
      total: 0,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

// ============================================================
// Estado del cron y trigger manual (Commit 8)
// ============================================================

export interface CronStatus {
  enabled: boolean;
  totalFallos: number;
  lastRunAt: string | null;
  lastRunNew: number;
  lastRunTotal: number;
  lastRunStatus: string | null;
}

export async function getJurisprudenceCronStatus(): Promise<CronStatus> {
  const prisma = await getTenantPrisma();
  await requireSession();

  const [setting, totalFallos, lastLog] = await Promise.all([
    prisma.systemSetting.findUnique({
      where: { key: "jurisprudenceAgentConfig" },
    }),
    prisma.jurisprudence.count(),
    prisma.jurisprudenceIngestLog.findFirst({
      orderBy: { startedAt: "desc" },
    }),
  ]);

  const config = setting?.value as { enabled?: boolean } | null;

  return {
    enabled: config?.enabled ?? false,
    totalFallos,
    lastRunAt: lastLog?.startedAt?.toISOString() ?? null,
    lastRunNew: lastLog?.totalNew ?? 0,
    lastRunTotal: lastLog?.totalFound ?? 0,
    lastRunStatus: lastLog?.status ?? null,
  };
}

export async function setJurisprudenceCronEnabled(enabled: boolean) {
  const prisma = await getTenantPrisma();
  await requireSession();

  const current = await prisma.systemSetting.findUnique({
    where: { key: "jurisprudenceAgentConfig" },
  });

  const existing = (current?.value as object) ?? {
    enabled: false,
    agents: [
      {
        id: "laboral_riesgos",
        keywords: ["despido con causa", "injuria laboral", "perdida de confianza"],
        maxPages: 3,
        pageSize: 20,
        enabled: true,
      },
      {
        id: "civil_casacion",
        keywords: ["recurso de casacion", "admisibilidad del recurso"],
        maxPages: 3,
        pageSize: 20,
        enabled: true,
      },
      {
        id: "penal_garantias",
        keywords: ["garantias constitucionales", "debido proceso"],
        maxPages: 3,
        pageSize: 20,
        enabled: true,
      },
    ],
  };

  const next = { ...existing, enabled };

  await prisma.systemSetting.upsert({
    where: { key: "jurisprudenceAgentConfig" },
    update: { value: next },
    create: { key: "jurisprudenceAgentConfig", value: next },
  });

  revalidatePath("/agents/jurisprudence");
  return { ok: true, enabled };
}

export async function triggerJurisprudenceIngestNow(): Promise<RunAgentResult> {
  const prisma = await getTenantPrisma();
  await requireSession();

  try {
    const { ingestJurisprudence } = await import(
      "@/server/cron/jobs/ingest-jurisprudence"
    );

    const result = await ingestJurisprudence();

    revalidatePath("/agents/jurisprudence");
    revalidatePath("/jurisprudence");

    return {
      ok: true,
      saved: result.totalNew,
      skipped: result.totalSkip,
      total: result.totalNew + result.totalSkip,
    };
  } catch (error) {
    console.error("[jurisprudence] Error trigger manual:", error);
    return {
      ok: false,
      saved: 0,
      skipped: 0,
      total: 0,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

// ============================================================
// Admin de jurisprudencia (Commit 8.5 — solo super admin)
// ============================================================

export interface AdminJurisprudenceStats {
  totalFallos: number;
  totalFuentes: number;
  totalAgentes: number;
  cronEnabled: boolean;
  lastRunAt: string | null;
  lastRunNew: number;
  lastRunStatus: string | null;
}

export async function getAdminJurisprudenceStats(): Promise<AdminJurisprudenceStats> {
  const prisma = await getTenantPrisma();
  const session = await requireSession();

  if (!session.user.isSystemAdmin && session.user.role !== "ADMIN") {
    throw new Error("Solo el super admin puede ver estas estadisticas");
  }

  const [totalFallos, setting, lastLog, distinctFuentes] = await Promise.all([
    prisma.jurisprudence.count(),
    prisma.systemSetting.findUnique({
      where: { key: "jurisprudenceAgentConfig" },
    }),
    prisma.jurisprudenceIngestLog.findFirst({
      orderBy: { startedAt: "desc" },
    }),
    prisma.jurisprudence.findMany({
      select: { source: true },
      distinct: ["source"],
    }),
  ]);

  const config = setting?.value as
    | { enabled?: boolean; agents?: { enabled?: boolean }[] }
    | null;

  const activeAgents =
    config?.agents?.filter((a) => a.enabled).length ?? 0;

  return {
    totalFallos,
    totalFuentes: distinctFuentes.length,
    totalAgentes: activeAgents,
    cronEnabled: config?.enabled ?? false,
    lastRunAt: lastLog?.startedAt?.toISOString() ?? null,
    lastRunNew: lastLog?.totalNew ?? 0,
    lastRunStatus: lastLog?.status ?? null,
  };
}

export interface AdminJurisprudenceAgent {
  id: string;
  keywords: string[];
  maxPages: number;
  pageSize: number;
  enabled: boolean;
}

export async function getAdminJurisprudenceAgents(): Promise<AdminJurisprudenceAgent[]> {
  const prisma = await getTenantPrisma();
  const session = await requireSession();

  if (!session.user.isSystemAdmin && session.user.role !== "ADMIN") {
    throw new Error("Solo el super admin puede ver los agentes");
  }

  const setting = await prisma.systemSetting.findUnique({
    where: { key: "jurisprudenceAgentConfig" },
  });

  const config = setting?.value as
    | { agents?: AdminJurisprudenceAgent[] }
    | null;

  return config?.agents ?? [];
}

export interface AdminJurisprudenceLog {
  id: string;
  source: string;
  query: string;
  agentId: string | null;
  totalFound: number;
  totalNew: number;
  totalSkip: number;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  error: string | null;
}

export async function getAdminJurisprudenceLogs(
  limit = 20
): Promise<AdminJurisprudenceLog[]> {
  const prisma = await getTenantPrisma();
  const session = await requireSession();

  if (!session.user.isSystemAdmin && session.user.role !== "ADMIN") {
    throw new Error("Solo el super admin puede ver los logs");
  }

  const logs = await prisma.jurisprudenceIngestLog.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
  });

  return logs.map((l) => ({
    id: l.id,
    source: l.source,
    query: l.query,
    agentId: l.agentId,
    totalFound: l.totalFound,
    totalNew: l.totalNew,
    totalSkip: l.totalSkip,
    startedAt: l.startedAt.toISOString(),
    finishedAt: l.finishedAt?.toISOString() ?? null,
    status: l.status,
    error: l.error,
  }));
}

// ============================================================
// Busqueda con full-text + paginacion + filtros (Commit 8.6b)
// ============================================================

export interface SearchJurisprudenceParams {
  query?: string;
  fuero?: string;
  jurisdiction?: string;
  yearFrom?: number;
  yearTo?: number;
  page?: number;
  pageSize?: number;
}

export interface SearchJurisprudenceResult {
  items: {
    id: string;
    title: string;
    summary: string | null;
    court: string | null;
    jurisdiction: string | null;
    fuero: string | null;
    date: Date | null;
    source: string | null;
    sourceUrl: string | null;
    category: string | null;
    numeroSumario: string | null;
    rank: number;
  }[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function searchJurisprudence(
  params: SearchJurisprudenceParams
): Promise<SearchJurisprudenceResult> {
  const prisma = await getTenantPrisma();
  await requireSession();

  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  // Full-text search
  if (params.query && params.query.trim().length > 0) {
    const tsQuery = params.query
      .trim()
      .split(/\s+/)
      .map((t) => t.replace(/[^\wáéíóúñÁÉÍÓÚÑ]/g, ""))
      .filter(Boolean)
      .join(" & ");

    if (tsQuery.length > 0) {
      conditions.push(
        `"searchVector" @@ to_tsquery('spanish', $${paramIndex})`
      );
      values.push(tsQuery);
      paramIndex++;
    }
  }

  // Filtros
  if (params.fuero) {
    conditions.push(`fuero = $${paramIndex}`);
    values.push(params.fuero);
    paramIndex++;
  }

  if (params.jurisdiction) {
    conditions.push(`jurisdiction = $${paramIndex}`);
    values.push(params.jurisdiction);
    paramIndex++;
  }

  if (params.yearFrom) {
    conditions.push(`EXTRACT(YEAR FROM date) >= $${paramIndex}`);
    values.push(params.yearFrom);
    paramIndex++;
  }

  if (params.yearTo) {
    conditions.push(`EXTRACT(YEAR FROM date) <= $${paramIndex}`);
    values.push(params.yearTo);
    paramIndex++;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Query de items
  const orderBy =
    params.query && params.query.trim().length > 0
      ? `ORDER BY ts_rank("searchVector", to_tsquery('spanish', $1)) DESC, date DESC`
      : `ORDER BY date DESC`;

  const itemsQuery = `
    SELECT id, title, summary, court, jurisdiction, fuero, date,
           source, "sourceUrl", category, "numeroSumario",
           ts_rank("searchVector", to_tsquery('spanish', ${
             params.query ? "$1" : "''"
           })) AS rank
    FROM "Jurisprudence"
    ${whereClause}
    ${orderBy}
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  const items = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      title: string;
      summary: string | null;
      court: string | null;
      jurisdiction: string | null;
      fuero: string | null;
      date: Date | null;
      source: string | null;
      sourceUrl: string | null;
      category: string | null;
      numeroSumario: string | null;
      rank: number;
    }>
  >(itemsQuery, ...values);

  // Query de total
  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM "Jurisprudence"
    ${whereClause}
  `;

  const countResult = await prisma.$queryRawUnsafe<Array<{ total: number }>>(
    countQuery,
    ...values
  );

  const total = countResult[0]?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export interface JurisprudenceFilterOptions {
  fueros: string[];
  jurisdictions: string[];
  years: number[];
}

export async function getJurisprudenceFilterOptionsNew(): Promise<JurisprudenceFilterOptions> {
  const prisma = await getTenantPrisma();
  await requireSession();

  const [fueros, jurisdictions, years] = await Promise.all([
    prisma.jurisprudence.findMany({
      where: { fuero: { not: null } },
      select: { fuero: true },
      distinct: ["fuero"],
      orderBy: { fuero: "asc" },
    }),
    prisma.jurisprudence.findMany({
      where: { jurisdiction: { not: null } },
      select: { jurisdiction: true },
      distinct: ["jurisdiction"],
      orderBy: { jurisdiction: "asc" },
    }),
    prisma.$queryRaw<Array<{ year: number }>>`
      SELECT DISTINCT EXTRACT(YEAR FROM date)::int AS year
      FROM "Jurisprudence"
      WHERE date IS NOT NULL
      ORDER BY year DESC
    `,
  ]);

  return {
    fueros: fueros.map((f) => f.fuero).filter(Boolean) as string[],
    jurisdictions: jurisdictions
      .map((j) => j.jurisdiction)
      .filter(Boolean) as string[],
    years: years.map((y) => y.year),
  };
}

export async function getJurisprudenceById(id: string) {
  const prisma = await getTenantPrisma();
  await requireSession();

  const item = await prisma.jurisprudence.findUnique({
    where: { id },
  });

  if (!item) {
    throw new Error("Jurisprudencia no encontrada");
  }

  return item;
}