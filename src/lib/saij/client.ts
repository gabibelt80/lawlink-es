/**
 * Cliente HTTP para SAIJ
 * Base URL: https://www.saij.gob.ar
 * Headers obligatorios: User-Agent + Origin + Referer (sin ellos: 403)
 */
import type {
  SaijSearchParams,
  SaijSearchResponse,
} from "./types";

const SAIJ_BASE_URL = "https://www.saij.gob.ar";
const SAIJ_TIMEOUT_MS = 60000;
const SAIJ_RATE_LIMIT_PER_SECOND = 2;
const SAIJ_MAX_RETRIES = 3;
const SAIJ_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

let lastRequestTime = 0;

/**
 * Espera si es necesario para respetar el rate limit.
 */
async function waitForRateLimit(): Promise<void> {
  const minDelay = 1000 / SAIJ_RATE_LIMIT_PER_SECOND;
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < minDelay) {
    await new Promise((resolve) => setTimeout(resolve, minDelay - elapsed));
  }
  lastRequestTime = Date.now();
}

/**
 * Headers obligatorios para pasar el WAF de SAIJ.
 */
function buildHeaders(): HeadersInit {
  return {
    "User-Agent": SAIJ_USER_AGENT,
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    Origin: SAIJ_BASE_URL,
    Referer: `${SAIJ_BASE_URL}/`,
  };
}

/**
 * Construye la URL de busqueda con los parametros correctos.
 */
function buildSearchUrl(params: SaijSearchParams): string {
  const search = new URLSearchParams();
  search.set("o", String(params.offset ?? 0));
  search.set("p", String(params.pageSize ?? 20));
  search.set("f", params.filter ?? "Total|Tipo de Documento/Jurisprudencia");
  search.set("r", params.query || "*:*");
  search.set("v", params.view ?? "colapsada");
  return `${SAIJ_BASE_URL}/busqueda?${search.toString()}`;
}

/**
 * Espera exponencial entre reintentos.
 */
function backoffMs(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 10000);
}

/**
 * Hace una busqueda en SAIJ con reintentos y rate limiting.
 */
export async function saijSearch(
  params: SaijSearchParams
): Promise<SaijSearchResponse> {
  const url = buildSearchUrl(params);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= SAIJ_MAX_RETRIES; attempt++) {
    try {
      await waitForRateLimit();

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), SAIJ_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch(url, {
          method: "GET",
          headers: buildHeaders(),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `SAIJ error (${response.status}): ${body.slice(0, 200)}`
        );
      }

      const json = (await response.json()) as SaijSearchResponse;
      return json;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // No reintentar en errores 4xx (excepto 429)
      if (lastError.message.includes("SAIJ error (4")) {
        if (!lastError.message.includes("429")) {
          throw lastError;
        }
      }

      if (attempt < SAIJ_MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs(attempt)));
      }
    }
  }

  throw lastError ?? new Error("SAIJ: fallo despues de reintentos");
}

/**
 * Test rapido de conexion: busca 1 documento con comodin.
 */
export async function saijPing(): Promise<boolean> {
  try {
    const r = await saijSearch({ query: "*:*", pageSize: 1 });
    return r.searchResults.totalSearchResults > 0;
  } catch {
    return false;
  }
}