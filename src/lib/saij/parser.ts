/**
 * Parser de respuestas SAIJ.
 * Convierte el documentAbstract (JSON anidado como string) a objeto plano
 * y normaliza al formato de la tabla Jurisprudence.
 */
import { createHash } from "crypto";
import type {
  SaijDocumentParsed,
  SaijSearchResultItem,
  JurisprudenceNormalized,
} from "./types";

/**
 * Parsea el documentAbstract (que es un string JSON) a objeto.
 * Devuelve null si no se puede parsear.
 */
export function parseDocumentAbstract(
  raw: string
): SaijDocumentParsed | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.document?.metadata || !parsed?.document?.content) {
      return null;
    }
    return {
      metadata: parsed.document.metadata,
      content: parsed.document.content,
    };
  } catch {
    return null;
  }
}

/**
 * Toma la primera fecha de una cadena con formato "YYYY-MM-DD|YYYY-MM-DD|...".
 */
function extractFirstDate(fecha: string | undefined): Date | null {
  if (!fecha) return null;
  const first = fecha.split("|")[0]?.trim();
  if (!first) return null;
  const d = new Date(first);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Genera un hash sha256 de un string.
 */
function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Construye el sourceUrl publico de SAIJ desde el friendly-url.
 */
function buildSourceUrl(
  subdomain: string | undefined,
  description: string | undefined,
  uuid: string
): string | null {
  if (!subdomain || !description) return null;
  return `https://www.saij.gob.ar/${subdomain}/${description}`;
}

/**
 * Normaliza un item de SAIJ al formato de la tabla Jurisprudence.
 * Devuelve null si el item no es parseable.
 */
export function normalizeItem(
  item: SaijSearchResultItem
): JurisprudenceNormalized | null {
  const parsed = parseDocumentAbstract(item.documentAbstract);
  if (!parsed) return null;

  const { metadata, content } = parsed;

  const title = content.titulo?.trim() || "(sin titulo)";
  const summary = content.texto?.trim() || null;
  const fullText = content.texto?.trim() || "";
  const court = content["tipo-tribunal"]?.trim() || null;
  const jurisdiction = content.jurisdiccion?.descripcion || null;
  const fuero = content.jurisdiccion?.codigo || null;
  const date = extractFirstDate(content.fecha);
  const sourceUrl = buildSourceUrl(
    metadata["friendly-url"]?.subdomain,
    metadata["friendly-url"]?.description,
    metadata.uuid
  );

  const hash = sha256(
    `${metadata.uuid}|${title}|${fullText.slice(0, 500)}`
  );

  return {
    fingerprint: metadata.uuid,
    hash,
    title,
    summary,
    fullText,
    court,
    jurisdiction,
    fuero,
    date,
    source: "SAIJ",
    sourceUrl,
    sourceId: metadata.uuid,
    category: metadata["document-content-type"] || null,
    tags: [],
    status: "downloaded",
  };
}

/**
 * Normaliza una lista completa de items. Filtra los que no se pueden parsear.
 */
export function normalizeItems(
  items: SaijSearchResultItem[]
): JurisprudenceNormalized[] {
  const result: JurisprudenceNormalized[] = [];
  for (const item of items) {
    const norm = normalizeItem(item);
    if (norm) result.push(norm);
  }
  return result;
}