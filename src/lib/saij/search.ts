/**
 * API de alto nivel para busqueda de jurisprudencia en SAIJ.
 * Uso: searchJurisprudencia({ query: "titulo:despido", pageSize: 20 })
 */
import { saijSearch } from "./client";
import { normalizeItems } from "./parser";
import type { JurisprudenceNormalized, SaijSearchParams } from "./types";

export interface JurisprudenceSearchResult {
  total: number;
  offset: number;
  pageSize: number;
  items: JurisprudenceNormalized[];
}

/**
 * Busca jurisprudencia en SAIJ y devuelve items normalizados.
 */
export async function searchJurisprudencia(
  params: SaijSearchParams
): Promise<JurisprudenceSearchResult> {
  const response = await saijSearch({
    ...params,
    filter: params.filter ?? "Total|Tipo de Documento/Jurisprudencia",
  });

  const items = normalizeItems(response.searchResults.documentResultList);

  // SAIJ devuelve el total real en categoriesResultList[0].facetChildren[0].facetHits
  // (totalSearchResults solo refleja la pagina actual, no el total)
  const facetTotal =
    (response.searchResults.categoriesResultList as Array<{
      facetChildren?: Array<{ facetHits?: number }>;
    }>)?.[0]?.facetChildren?.[0]?.facetHits;

  return {
    total: typeof facetTotal === "number" ? facetTotal : response.searchResults.totalSearchResults,
    offset: response.queryObjectData.offset,
    pageSize: response.queryObjectData.pageSize,
    items,
  };
}

/**
 * Busca por titulo (sintaxis Lucene: titulo:palabra).
 */
export async function searchByTitulo(
  termino: string,
  pageSize = 20,
  offset = 0
): Promise<JurisprudenceSearchResult> {
  return searchJurisprudencia({
    query: `titulo:${termino}`,
    pageSize,
    offset,
  });
}

/**
 * Busca por texto completo (sintaxis Lucene: texto:palabra).
 */
export async function searchByTexto(
  termino: string,
  pageSize = 20,
  offset = 0
): Promise<JurisprudenceSearchResult> {
  return searchJurisprudencia({
    query: `texto:${termino}`,
    pageSize,
    offset,
  });
}

/**
 * Busca en todas las fuentes (sin filtro de tipo).
 * Util para fallback si no hay resultados con filtro de jurisprudencia.
 */
export async function searchGlobal(
  termino: string,
  pageSize = 20,
  offset = 0
): Promise<JurisprudenceSearchResult> {
  return searchJurisprudencia({
    query: `titulo:${termino}`,
    filter: "Total",
    pageSize,
    offset,
  });
}