import { CATEGORIAS_VALIDAS } from "./tribunal-map";
import type { JurisprudenceNormalized } from "./types";

const MIN_TEXT_LENGTH = 200;

export type VerifyResult =
  | { ok: true; reason?: undefined }
  | { ok: false; reason: string };

export function verifyJurisprudenceItem(
  item: JurisprudenceNormalized
): VerifyResult {
  if (!item.title || item.title === "(sin titulo)") {
    return { ok: false, reason: "sin titulo" };
  }
  if (!item.fullText || item.fullText.length < MIN_TEXT_LENGTH) {
    return {
      ok: false,
      reason: `texto muy corto (${item.fullText?.length ?? 0} chars)`,
    };
  }
  if (item.category && !CATEGORIAS_VALIDAS.includes(item.category as never)) {
    return { ok: false, reason: `categoria invalida: ${item.category}` };
  }
  if (!item.sourceId || !item.fingerprint) {
    return { ok: false, reason: "sin uuid de origen" };
  }
  return { ok: true };
}