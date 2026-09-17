/**
 * Tipos para el cliente SAIJ
 * Endpoint: https://www.saij.gob.ar/busqueda
 * Query params: o (offset), p (page size), f (filtro), r (query Lucene), v (vista)
 */

export interface SaijSearchParams {
  query: string;         // ej: "titulo:despido" o "*:*"
  filter?: string;       // ej: "Total|Tipo de Documento/Jurisprudencia"
  offset?: number;       // default 0
  pageSize?: number;     // default 20
  view?: "colapsada" | "detallada";  // default "colapsada"
}

export interface SaijSearchResultItem {
  uuid: string;
  documentScore: number;
  documentAbstract: string;  // JSON stringificado
}

export interface SaijSearchResponse {
  queryObjectData: {
    facets: string;
    offset: number;
    pageSize: number;
    query: string;
    rawQuery: string;
    sortBy: string;
    viewType: string;
  };
  searchResults: {
    totalSearchResults: number;
    inputQuery: string;
    expandedQuery: string;
    iterationToken: string;
    documentResultList: SaijSearchResultItem[];
    categoriesResultList: unknown[];
  };
}

/**
 * Estructura parseada del documentAbstract (JSON anidado como string).
 */
export interface SaijDocumentMetadata {
  uuid: string;
  "document-content-type": string;
  "friendly-url"?: {
    subdomain: string;
    description: string;
  };
}

export interface SaijDocumentContent {
  "numero-sumario"?: string;
  descriptores?: unknown;
  fecha?: string;
  jurisdiccion?: {
    codigo: string;
    descripcion: string;
    capital: string;
    "id-pais": number;
  };
  "numero-interno"?: string;
  "tipo-tribunal"?: string;
  texto?: string;
  titulo?: string;
}

export interface SaijDocumentParsed {
  metadata: SaijDocumentMetadata;
  content: SaijDocumentContent;
}

/**
 * Documento normalizado para guardar en la tabla Jurisprudence.
 */
export interface JurisprudenceNormalized {
  fingerprint: string;
  hash: string;
  title: string;
  summary: string | null;
  fullText: string;
  court: string | null;
  jurisdiction: string | null;
  fuero: string | null;
  date: Date | null;
  source: string;
  sourceUrl: string | null;
  sourceId: string;
  category: string | null;
  tags: string[];
  status: string;

  // v0.4: campos extendidos
  numeroSumario: string | null;
  descriptors: unknown;
  citesUuids: string[];
}