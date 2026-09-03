/**
 * pesoså…¸å¼€æ”¾å¹³å° HTTP Clienteç«¯ï¼ˆserver-side onlyï¼‰
 *
 * å…¥å£ï¼šPOST {baseUrl}/{routeKey}ï¼Œheader X-API-Keyã€‚
 * è¯¦è§ https://open.chineselaw.com/llms-full.txt
 */
import { getYuandianSettings, type ResolvedYuandianSettings } from "./settings";

export class YuandianNotConfiguredError extends Error {
  constructor() {
    super(
      "La API de Yuandian no estÃ¡ configurada; primero ingresÃ¡ la clave de la API en ConfiguraciÃ³n â†’ Acceso a IA",
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
  ay?: string[]; // Causaæ•°ç»„
  ajlb?:
    | "PenalCaso"
    | "æ°‘äº‹Caso"
    | "AdministrativoCaso"
    | "æ‰§è¡ŒCaso"
    | "ç®¡è¾–Caso"
    | "å›½å®¶èµ”å¿yå¸æ³•æ•‘åŠ©Caso"
    | "å¼ºåˆ¶æ¸…ç®—yç ´äº§Caso"
    | "å›½é™…å¸æ³•ååŠ©Caso"
    | "éžè¯‰PreservaciÃ³nå®¡æŸ¥Caso"
    | "å…¶ä»–Caso";
  xzqh_p?: string[]; // çœçº§AdministrativoåŒº
  wszl?: ("åˆ¤å†³ä¹¦" | "è£å®šä¹¦" | "è°ƒè§£ä¹¦" | "å†³å®šä¹¦")[];
  qw?: string; // å…¨æ–‡å…³é”®è¯ï¼ˆç©ºæ ¼æ‹†åˆ†ï¼‰
  ja_start?: string; // yyyy-MM-dd
  ja_end?: string;
  top_k?: number; // é»˜è®¤ 10ï¼Œæœ€å¤§ 50
};

export type PtalCase = {
  type: string;
  id: string;
  ah: string; // æ¡ˆå·
  title: string;
  ay: string[]; // Causa
  jbdw: string; // ç»åŠžæ³•é™¢
  ajlb: string; // Casoç±»åˆ«
  xzqh_p: string; // çœä»½
  wszl: string; // æ–‡ä¹¦ç§ç±»
  cprq: string; // è£åˆ¤Fecha
  content: string; // å†…å®¹ç‰‡æ®µ
  url: string; // è¯¦æƒ…ç›¸å¯¹è·¯å¾„
  score: number;
};

export type PtalSearchResult = {
  total: number;
  items: PtalCase[];
};

/**
 * æ™®é€šæ¡ˆä¾‹å…³é”®è¯æ£€ç´¢ï¼ˆrh_ptal_searchï¼Œè®¡è´¹ 10 POINT/æ¬¡ï¼‰
 *
 * è¯·æ±‚ä½“ä¸èƒ½å®Œå…¨ä¸ºç©ºï¼Œè°ƒç”¨æ–¹è‡³å°‘ä¼ ä¸€ä¸ªè¿‡æ»¤æ¡ä»¶ï¼ˆay/qw/jbdw etc.ï¼‰ã€‚
 */
export async function searchPtalCases(
  params: PtalSearchParams,
  resolved?: ResolvedYuandianSettings,
): Promise<PtalSearchResult> {
  const s = resolved ?? (await getYuandianSettings());
  if (!s.configured) throw new YuandianNotConfiguredError();

  // pesoså…¸è¦æ±‚ body éžç©ºï¼›è°ƒç”¨æ–¹è‡³å°‘è¦ä¼ ä¸€ä¸ªè¿‡æ»¤æ¡ä»¶
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
      "è‡³å°‘å¡«å†™ä¸€ä¸ªæ£€ç´¢æ¡ä»¶ï¼ˆCausa / å…³é”®è¯ / æ³•é™¢ / åœ°åŒº / Fechaï¼‰",
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
      json.message ?? "pesoså…¸VolverError",
      json.code ?? 500,
    );
  }
  // æœªå‘½ä¸­ï¼šdata === null
  if (!json.data) return { total: 0, items: [] };
  return {
    total: json.data.total ?? 0,
    items: json.data.lst ?? [],
  };
}

/**
 * æ‹¼å‡ºpesoså…¸å‰ç«¯çš„æ¡ˆä¾‹è¯¦æƒ…å®Œæ•´ URLï¼ˆç”¨äºŽ"Verå…¨æ–‡"å¤–è·³ï¼‰ã€‚
 * caseDetailHost é»˜è®¤ https://www.chineselaw.comï¼Œå¯åœ¨ConfiguraciÃ³né‡Œæ”¹ã€‚
 */
export function buildCaseDetailUrl(host: string, relPath: string): string {
  const h = host.replace(/\/$/, "");
  const p = relPath.startsWith("/") ? relPath : `/${relPath}`;
  return `${h}${p}`;
}

// ============================================================
// v0.22: è¯­ä¹‰æ£€ç´¢ case_vector_searchï¼ˆ10 POINT/æ¬¡ï¼‰
// ============================================================

const WSZL_NAME_TO_CODE: Record<string, string> = {
  åˆ¤å†³ä¹¦: "1",
  è£å®šä¹¦: "2",
  è°ƒè§£ä¹¦: "3",
  å†³å®šä¹¦: "4",
};

export type VectorSearchParams = {
  query: string; // å¿…å¡«ï¼Œè‡ªç„¶è¯­è¨€
  ay?: string[]; // Causaåï¼ˆvector æŽ¥å—åå­—ï¼Œä¸æ˜¯ codeï¼‰
  ajlb?: PtalSearchParams["ajlb"]; // åŒ ptal çš„ä¸­æ–‡æžšä¸¾
  xzqh_p?: string; // âš  vector è¿™é‡Œæ˜¯ string å•å€¼ï¼Œä¸æ˜¯æ•°ç»„
  wszl?: ("åˆ¤å†³ä¹¦" | "è£å®šä¹¦" | "è°ƒè§£ä¹¦" | "å†³å®šä¹¦")[]; // æˆ‘ä»¬å¯¹å¤–ä»ä¼ åå­—ï¼Œå†…éƒ¨è½¬ code
  ja_start?: string;
  ja_end?: string;
  return_num?: number; // é»˜è®¤ 10ï¼Œä¸Šé™ 50ï¼ˆæˆ‘ä»¬è‡ªå·±åŠ ä¿æŠ¤ï¼‰
};

export type VectorCase = {
  scid: string;
  title: string;
  ah: string;
  ay: string[]; // âš  Volverçš„æ˜¯ code æ•°ç»„ï¼Œä¸æ˜¯åå­—
  anyou?: string[]; // Causaåï¼ˆå¦‚æžœVolverå­—æ®µæœ‰çš„è¯ï¼Œåšå…œåº•ï¼‰
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
  if (!query) throw new Error("è¯­ä¹‰æ£€ç´¢ query ä¸èƒ½ä¸ºç©º");

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
  body.rewrite_flag = false; // èµ°åŽŸ queryï¼›æ”¹å†™ç»å¸¸ç»™å¥‡æ€ªç»“æžœ

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

  // è¯­ä¹‰æŽ¥å£æˆåŠŸ code æ˜¯ 201ï¼ˆæŒ‰æ–‡æ¡£ç¤ºä¾‹ï¼‰ï¼›ä¿é™©æŽ¥å— 200-299
  const code = json.code ?? 0;
  if (code < 200 || code >= 300) {
    throw new YuandianApiError(json.msg ?? "pesoså…¸è¯­ä¹‰æ£€ç´¢Error", code);
  }
  return { items: json.extra?.wenshu ?? [] };
}

/** è¯­ä¹‰æ£€ç´¢è¯¦æƒ… URLï¼šscid â†’ /ydzk/caseDetail/case/<scid> */
export function buildVectorCaseDetailUrl(host: string, scid: string): string {
  return buildCaseDetailUrl(host, `/ydzk/caseDetail/case/${scid}`);
}

