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