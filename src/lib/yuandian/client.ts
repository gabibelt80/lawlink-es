/**
 * pesos典开放平台 HTTP Cliente端（server-side only）
 *
 * 入口：POST {baseUrl}/{routeKey}，header X-API-Key。
 * 详见 https://open.chineselaw.com/llms-full.txt
 */
import { getYuandianSettings, type ResolvedYuandianSettings } from "./settings";

export class YuandianNotConfiguredError extends Error {
  constructor() {
    super(
      "La API de Yuandian no está configurada; primero ingresá la clave de la API en Configuración → Acceso a IA",
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
  ay?: string[]; // Causa数组
  ajlb?:
    | "PenalCaso"
    | "民事Caso"
    | "AdministrativoCaso"
    | "执行Caso"
    | "管辖Caso"
    | "国家赔偿y司法救助Caso"
    | "强制清算y破产Caso"
    | "国际司法协助Caso"
    | "非诉Preservación审查Caso"
    | "其他Caso";
  xzqh_p?: string[]; // 省级Administrativo区
  wszl?: ("判决书" | "裁定书" | "调解书" | "决定书")[];
  qw?: string; // 全文关键词（空格拆分）
  ja_start?: string; // yyyy-MM-dd
  ja_end?: string;
  top_k?: number; // 默认 10，最大 50
};

export type PtalCase = {
  type: string;
  id: string;
  ah: string; // 案号
  title: string;
  ay: string[]; // Causa
  jbdw: string; // 经办法院
  ajlb: string; // Caso类别
  xzqh_p: string; // 省份
  wszl: string; // 文书种类
  cprq: string; // 裁判Fecha
  content: string; // 内容片段
  url: string; // 详情相对路径
  score: number;
};

export type PtalSearchResult = {
  total: number;
  items: PtalCase[];
};

/**
 * 普通案例关键词检索（rh_ptal_search，计费 10 POINT/次）
 *
 * 请求体不能完全为空，调用方至少传一个过滤条件（ay/qw/jbdw etc.）。
 */
export async function searchPtalCases(
  params: PtalSearchParams,
  resolved?: ResolvedYuandianSettings,
): Promise<PtalSearchResult> {
  const s = resolved ?? (await getYuandianSettings());
  if (!s.configured) throw new YuandianNotConfiguredError();

  // pesos典要求 body 非空；调用方至少要传一个过滤条件
  const hasAny =
    (params.ay?.length ?? 0) > 0 ||
    !!params.qw?.trim() ||
    (params.xzqh_p?.length ?? 0) > 0 ||
    !!params.ajlb ||
    (params.wszl?.length ?? 0) > 0 ||
    !!params.ja_start ||
    !!params.ja_end;
  if (!hasAny)
    throw new Error(
      "至少填写一个检索条件（Causa / 关键词 / 法院 / 地区 / Fecha）",
    );

  const body: Record<string, unknown> = {};
  if (params.ay?.length) body.ay = params.ay;
  if (params.ajlb) body.ajlb = params.ajlb;
  if (params.xzqh_p?.length) body.xzqh_p = params.xzqh_p;
  if (params.wszl?.length) body.wszl = params.wszl;
  if (params.qw?.trim()) {
    body.qw = params.qw.trim();
    body.search_mode = "and";
  }
  if (params.ja_start) body.ja_start = params.ja_start;
  if (params.ja_end) body.ja_end = params.ja_end;
  body.top_k = Math.min(Math.max(params.top_k ?? 10, 1), 50);

  const url = `${s.baseUrl.replace(/\/$/, "")}/rh_ptal_search`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  let json: {
    status?: string;
    code?: number;
    message?: string;
    data?: { total?: number; lst?: PtalCase[] } | null;
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-Key": s.apiKey,
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      throw new YuandianApiError(`HTTP ${res.status}`, res.status);
    }
    json = await res.json();
  } finally {
    clearTimeout(timer);
  }

  if (json.status !== "success") {
    throw new YuandianApiError(
      json.message ?? "pesos典VolverError",
      json.code ?? 500,
    );
  }
  // 未命中：data === null
  if (!json.data) return { total: 0, items: [] };
  return {
    total: json.data.total ?? 0,
    items: json.data.lst ?? [],
  };
}

/**
 * 拼出pesos典前端的案例详情完整 URL（用于"Ver全文"外跳）。
 * caseDetailHost 默认 https://www.chineselaw.com，可在Configuración里改。
 */
export function buildCaseDetailUrl(host: string, relPath: string): string {
  const h = host.replace(/\/$/, "");
  const p = relPath.startsWith("/") ? relPath : `/${relPath}`;
  return `${h}${p}`;
}

// ============================================================
// v0.22: 语义检索 case_vector_search（10 POINT/次）
// ============================================================

const WSZL_NAME_TO_CODE: Record<string, string> = {
  判决书: "1",
  裁定书: "2",
  调解书: "3",
  决定书: "4",
};

export type VectorSearchParams = {
  query: string; // 必填，自然语言
  ay?: string[]; // Causa名（vector 接受名字，不是 code）
  ajlb?: PtalSearchParams["ajlb"]; // 同 ptal 的中文枚举
  xzqh_p?: string; // ⚠ vector 这里是 string 单值，不是数组
  wszl?: ("判决书" | "裁定书" | "调解书" | "决定书")[]; // 我们对外仍传名字，内部转 code
  ja_start?: string;
  ja_end?: string;
  return_num?: number; // 默认 10，上限 50（我们自己加保护）
};

export type VectorCase = {
  scid: string;
  title: string;
  ah: string;
  ay: string[]; // ⚠ Volver的是 code 数组，不是名字
  anyou?: string[]; // Causa名（如果Volver字段有的话，做兜底）
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
  const s = resolved ?? (await getYuandianSettings());
  if (!s.configured) throw new YuandianNotConfiguredError();
  const query = params.query.trim();
  if (!query) throw new Error("语义检索 query 不能为空");

  const filter: Record<string, unknown> = {};
  if (params.ay?.length) filter.ay = params.ay;
  if (params.ajlb) filter.wenshu_type = params.ajlb;
  if (params.xzqh_p) filter.xzqh_p = params.xzqh_p;
  if (params.wszl?.length) {
    const codes = params.wszl
      .map((n) => WSZL_NAME_TO_CODE[n])
      .filter((c): c is string => !!c);
    if (codes.length) filter.wszl = codes;
  }
  if (params.ja_start) filter.ja_start = params.ja_start;
  if (params.ja_end) filter.ja_end = params.ja_end;

  const body: Record<string, unknown> = { query };
  if (Object.keys(filter).length) body.wenshu_filter = filter;
  body.return_num = Math.min(Math.max(params.return_num ?? 10, 1), 50);
  body.rewrite_flag = false; // 走原 query；改写经常给奇怪结果

  const url = `${s.baseUrl.replace(/\/$/, "")}/case_vector_search`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60_000);
  let json: {
    code?: number;
    msg?: string;
    extra?: { wenshu?: VectorCase[] };
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-Key": s.apiKey,
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new YuandianApiError(`HTTP ${res.status}`, res.status);
    json = await res.json();
  } finally {
    clearTimeout(timer);
  }

  // 语义接口成功 code 是 201（按文档示例）；保险接受 200-299
  const code = json.code ?? 0;
  if (code < 200 || code >= 300) {
    throw new YuandianApiError(json.msg ?? "pesos典语义检索Error", code);
  }
  return { items: json.extra?.wenshu ?? [] };
}

/** 语义检索详情 URL：scid → /ydzk/caseDetail/case/<scid> */
export function buildVectorCaseDetailUrl(host: string, scid: string): string {
  return buildCaseDetailUrl(host, `/ydzk/caseDetail/case/${scid}`);
}
