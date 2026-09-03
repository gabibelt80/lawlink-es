/**
 * Integracion Yuandian (desactivada para Argentina)
 * Se mantiene la estructura para no romper imports, pero no llama a la API.
 */
import { getYuandianSettings, type ResolvedYuandianSettings } from "./settings";

export class YuandianNotConfiguredError extends Error {
  constructor() {
    super(
      "La API de Yuandian no esta configurada",
    );
    this.name = "YuandianNotConfiguredError";
  }
}

export class YuandianApiError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
    this.name = "YuandianApiError";
  }
}

export type PtalSearchParams = {
  ay?: string[];
  ajlb?: string;
  xzqh_p?: string[];
  wszl?: string[];
  qw?: string;
  ja_start?: string;
  ja_end?: string;
  top_k?: number;
};

export type PtalCase = {
  type: string;
  id: string;
  ah: string;
  title: string;
  ay: string[];
  jbdw: string;
  ajlb: string;
  xzqh_p: string;
  wszl: string;
  cprq: string;
  content: string;
  url: string;
  score: number;
};

export type PtalSearchResult = {
  total: number;
  items: PtalCase[];
};

export async function searchPtalCases(
  params: PtalSearchParams,
  resolved?: ResolvedYuandianSettings,
): Promise<PtalSearchResult> {
  return { total: 0, items: [] };
}

export function buildCaseDetailUrl(host: string, relPath: string): string {
  return "";
}

export type VectorSearchParams = {
  query: string;
  ay?: string[];
  ajlb?: PtalSearchParams["ajlb"];
  xzqh_p?: string;
  wszl?: string[];
  ja_start?: string;
  ja_end?: string;
  return_num?: number;
};

export type VectorCase = {
  scid: string;
  title: string;
  ah: string;
  ay: string[];
  anyou?: string[];
  jbdw: string | null;
  ajlb: string;
  wszl: string;
  xzqh_p: string;
  xzqh_c: string;
  cj: string;
  jaDate: number;
  jand: number;
  content: string;
  score: number;
};

export type VectorSearchResult = {
  items: VectorCase[];
};

export async function searchCasesByVector(
  params: VectorSearchParams,
  resolved?: ResolvedYuandianSettings,
): Promise<VectorSearchResult> {
  return { items: [] };
}

export function buildVectorCaseDetailUrl(host: string, scid: string): string {
  return "";
}