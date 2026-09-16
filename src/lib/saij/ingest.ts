/**
 * Motor de ingesta de jurisprudencia desde SAIJ.
 * - Pagina resultados
 * - Deduplica por fingerprint
 * - Guarda en lotes con createMany
 * - Registra en JurisprudenceIngestLog
 * SIN IA. Solo texto.
 */
import { PrismaClient } from "@prisma/client";
import { searchJurisprudencia } from "./search";
import type { JurisprudenceNormalized } from "./types";

export interface IngestParams {
  query: string;
  filter?: string;
  agentId?: string;
  maxPages?: number;
  pageSize?: number;
  dryRun?: boolean;
}

export interface IngestResult {
  logId: string | null;
  totalFound: number;
  totalNew: number;
  totalSkip: number;
  status: "ok" | "error";
  error?: string;
}

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_MAX_PAGES = 5;

export async function ingestFromSaij(
  params: IngestParams
): Promise<IngestResult> {
  const prisma = new PrismaClient();
  const {
    query,
    filter,
    agentId,
    maxPages = DEFAULT_MAX_PAGES,
    pageSize = DEFAULT_PAGE_SIZE,
    dryRun = false,
  } = params;

  let logId: string | null = null;

  if (!dryRun) {
    const log = await prisma.jurisprudenceIngestLog.create({
      data: {
        source: "SAIJ",
        query,
        agentId: agentId ?? null,
        status: "running",
      },
    });
    logId = log.id;
  }

  let totalFound = 0;
  let totalNew = 0;
  let totalSkip = 0;

  try {
    const allItems: JurisprudenceNormalized[] = [];

    for (let page = 0; page < maxPages; page++) {
      const offset = page * pageSize;
      console.log(`[ingest] Pagina ${page + 1}/${maxPages} (offset=${offset})`);

      const result = await searchJurisprudencia({
        query,
        filter,
        pageSize,
        offset,
      });

      totalFound += result.total;

      if (result.items.length === 0) {
        console.log("[ingest] Sin resultados. Cortando.");
        break;
      }

      allItems.push(...result.items);

      if (result.items.length < pageSize) {
        console.log("[ingest] Ultima pagina (items < pageSize). Cortando.");
        break;
      }
    }

    console.log(`[ingest] Total descargado: ${allItems.length} items`);

    if (dryRun) {
      console.log("[ingest] Modo dry-run: no se guarda nada.");
      return {
        logId: null,
        totalFound,
        totalNew: 0,
        totalSkip: allItems.length,
        status: "ok",
      };
    }

    // Dedupe por fingerprint
    const fingerprints = allItems.map((i) => i.fingerprint);
    const existing = await prisma.jurisprudence.findMany({
      where: { fingerprint: { in: fingerprints } },
      select: { fingerprint: true },
    });
    const existingSet = new Set(existing.map((e) => e.fingerprint));

    const toInsert = allItems.filter(
      (i) => !existingSet.has(i.fingerprint)
    );
    totalSkip = allItems.length - toInsert.length;
    totalNew = toInsert.length;

    console.log(
      `[ingest] Nuevos: ${totalNew} | Ya existentes: ${totalSkip}`
    );

    // Insertar en lotes de 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      await prisma.jurisprudence.createMany({
        data: batch.map((item) => ({
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
          numeroSumario: item.numeroSumario,
          descriptors: item.descriptors as object,
          citesUuids: item.citesUuids,
        })),
        skipDuplicates: true,
      });
      console.log(`[ingest] Lote insertado: ${batch.length} items`);
    }

    if (logId) {
      await prisma.jurisprudenceIngestLog.update({
        where: { id: logId },
        data: {
          totalFound,
          totalNew,
          totalSkip,
          status: "ok",
          finishedAt: new Date(),
        },
      });
    }

    return {
      logId,
      totalFound,
      totalNew,
      totalSkip,
      status: "ok",
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Error desconocido";
    console.error("[ingest] Error:", errMsg);

    if (logId) {
      await prisma.jurisprudenceIngestLog.update({
        where: { id: logId },
        data: {
          status: "error",
          error: errMsg,
          finishedAt: new Date(),
        },
      });
    }

    return {
      logId,
      totalFound,
      totalNew,
      totalSkip,
      status: "error",
      error: errMsg,
    };
  } finally {
    await prisma.$disconnect();
  }
}