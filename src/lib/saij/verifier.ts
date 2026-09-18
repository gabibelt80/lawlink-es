import { CATEGORIAS_VALIDAS } from "./tribunal-map";
import type { JurisprudenceNormalized } from "./types";

const MIN_TEXT_LENGTH = 100;

export type VerifyResult =
  | { ok: true; reason?: undefined }
  | { ok: false; reason: string };

export function verifyJurisprudenceItem(
  item: JurisprudenceNormalized
): VerifyResult {
  // Titulo obligatorio, pero aceptamos "(sin titulo)" como valido (SAIJ
  // devuelve muchos sumarios sin titulo, y son utiles igual)
  if (!item.title) {
    return { ok: false, reason: "sin titulo" };
  }
  if (!item.fullText || item.fullText.length < MIN_TEXT_LENGTH) {
    return {
      ok: false,
      reason: `texto muy corto (${item.fullText?.length ?? 0} chars)`,
    };
  }
  // Categoria: solo rechazamos si es un valor desconocido que NO sea
  // "sumario" ni "jurisprudencia" (que son valores raw de SAIJ)
  if (
    item.category &&
    item.category !== "sumario" &&
    item.category !== "jurisprudencia" &&
    !CATEGORIAS_VALIDAS.includes(item.category as never)
  ) {
    return { ok: false, reason: `categoria invalida: ${item.category}` };
  }
  if (!item.sourceId || !item.fingerprint) {
    return { ok: false, reason: "sin uuid de origen" };
  }
  return { ok: true };
}