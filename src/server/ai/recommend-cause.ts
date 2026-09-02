"use server";

/**
 * v0.19: Recomendación de causa por IA
 *
 * Ingresa la descripción del caso → el LLM devuelve 3 causas de 4to nivel + motivo de recomendación + confianza
 * → Usa searchCauses para buscar el id en la base (descarta las no encontradas)
 * → Devuelve lista de candidatos con el objeto cause de la base
 */
import type { MatterCategory, ProcedureType } from "@prisma/client";
import { aiChat, extractJson, AiNotConfiguredError } from "@/lib/ai/client";
import { searchCauses, type CauseSearchResult } from "@/server/causes/actions";
import { requireSession } from "@/lib/auth/session";

export type CauseConfidence = "HIGH" | "MEDIUM" | "LOW";

export type CauseRecommendation = {
  cause: CauseSearchResult;
  reason: string;
  confidence: CauseConfidence;
};

type LlmCandidate = {
  name?: unknown;
  reason?: unknown;
  confidence?: unknown;
};

const SYSTEM_PROMPT = `Sos un asistente de clasificación de causas legales de Argentina.
Según la categoría del caso y la descripción de los hechos dada por el usuario, seleccioná las 3 causas **más específicas** (tercer o cuarto nivel) más cercanas del sistema de causas civiles/penales/administrativas argentinas.

Respondé estrictamente con el siguiente array JSON (solo JSON, sin texto explicativo):
[
  {"name": "Nombre completo de la causa (ej.: Conflicto de compraventa)", "reason": "Por qué se ajusta a este caso, máximo 30 caracteres", "confidence": "HIGH" | "MEDIUM" | "LOW"},
  ...
]

Reglas:
- Devolvé 3 resultados ordenados por relevancia de mayor a menor
- El nombre de la causa debe usar la denominación formal completa
- Priorizá causas específicas de último nivel, evitá clasificaciones genéricas de segundo nivel
- Autoevaluación de confianza: HIGH = los elementos del caso coinciden completamente; MEDIUM = los elementos principales coinciden pero hay ambigüedad; LOW = información insuficiente, solo se puede adivinar`;

function categoryHint(category: MatterCategory): string {
  switch (category) {
    case "CIVIL_COMMERCIAL":
      return "Civil/Comercial";
    case "CRIMINAL":
      return "Penal";
    case "ADMINISTRATIVE":
      return "Administrativo";
    case "NON_LITIGATION":
      return "No contencioso";
    case "LEGAL_COUNSEL":
      return "Asesoría legal permanente";
    case "SPECIAL_PROJECT":
      return "Proyecto especial";
    default:
      return category;
  }
}

function normalizeConfidence(v: unknown): CauseConfidence {
  const s = typeof v === "string" ? v.toUpperCase() : "";
  if (s === "HIGH" || s === "MEDIUM" || s === "LOW") return s;
  return "MEDIUM";
}

/**
 * Búsqueda inversa: mapea el nombre de causa dado por el LLM a un registro de la base.
 * - Prioriza coincidencia exacta de nombre
 * - Si no, toma el primer resultado de searchCauses
 * - Filtra los de nivel < 3 (segundo nivel es muy genérico, mejor no recomendar)
 */
async function resolveCauseId(
  category: MatterCategory,
  procedureType: ProcedureType | null | undefined,
  rawName: string,
): Promise<CauseSearchResult | null> {
  const name = rawName.trim();
  if (!name) return null;
  const hits = await searchCauses({
    category,
    procedureType,
    query: name,
    limit: 10,
  });
  if (hits.length === 0) return null;
  const exact = hits.find((h) => h.name === name && h.level >= 3);
  if (exact) return exact;
  const leaf = hits.find((h) => h.level >= 3);
  return leaf ?? null;
}

export async function recommendCause(input: {
  category: MatterCategory;
  procedureType?: ProcedureType | null;
  situation: string;
}): Promise<CauseRecommendation[]> {
  await requireSession();

  const situation = input.situation.trim();
  if (situation.length < 5) {
    throw new Error(
      "La descripción del caso es demasiado corta; debe tener al menos 5 caracteres.",
    );
  }

  let content = "";
  try {
    const res = await aiChat({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Categoría del caso: ${categoryHint(input.category)}\n\nHechos:\n${situation.slice(0, 4000)}`,
        },
      ],
      maxTokens: 800,
      temperature: 0.1,
    });
    content = res.content;
  } catch (err) {
    if (err instanceof AiNotConfiguredError) throw err;
    throw new Error(err instanceof Error ? err.message : "Error en la solicitud de IA");
  }

  const parsed = extractJson<LlmCandidate[]>(content);
  if (!Array.isArray(parsed)) {
    throw new Error("El contenido devuelto por la IA no se pudo interpretar como lista de candidatos");
  }

  const results: CauseRecommendation[] = [];
  for (const item of parsed.slice(0, 5)) {
    const name = typeof item.name === "string" ? item.name : "";
    const reason = typeof item.reason === "string" ? item.reason : "";
    const confidence = normalizeConfidence(item.confidence);
    const cause = await resolveCauseId(
      input.category,
      input.procedureType,
      name,
    );
    if (!cause) continue;
    if (results.some((r) => r.cause.id === cause.id)) continue;
    results.push({ cause, reason, confidence });
    if (results.length >= 3) break;
  }

  if (results.length === 0) {
    throw new Error("Las causas recomendadas por la IA no están en la biblioteca de causas, seleccioná manualmente");
  }

  return results;
}