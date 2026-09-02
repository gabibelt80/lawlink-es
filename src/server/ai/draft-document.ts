"use server";

/**
 * v0.28: Redacción guiada de documentos con IA (similar a la redacción por formulario de "Caso cloud")
 *
 * El usuario completa en el frontend: tipo de documento + nuestra parte / contraparte + antecedentes del caso + pretensiones,
 * aquí se arma un prompt estructurado para aiChat, devuelve borrador en Markdown para previsualizar / copiar / descargar.
 *
 * Principio: solo redacta según la información proporcionada por el usuario, no inventa hechos, pruebas ni números de artículos específicos;
 * la información faltante se indica con marcadores 【】. El resultado es solo un borrador, debe ser revisado por un abogado.
 */
import { requireSession } from "@/lib/auth/session";
import { aiChat, AiNotConfiguredError } from "@/lib/ai/client";

export type DraftInput = {
  docType: string; // Tipo de documento, ej.: "Demanda civil"
  selfParty?: string; // Nuestra parte
  opposingParty?: string; // Parte contraria
  background?: string; // Antecedentes del caso
  claims?: string; // Pretensión / alegación principal
  extra?: string; // Información adicional
};

export type DraftResult =
  | { ok: true; content: string }
  | { ok: false; reason: "not_configured" | "error"; message: string };

const SYSTEM_PROMPT = `Sos un abogado con amplia experiencia en la redacción de documentos legales argentinos.
Según la información brindada por el usuario, redactá un borrador de documento legal con estructura normativa y terminología profesional, en formato Markdown.
Requisitos:
1. Respetá estrictamente el formato general de este tipo de documento (datos de las partes, cuerpo, peticiones/hechos y fundamentos, cierre, etc.).
2. Redactá únicamente con base en la información suministrada; no inventes identidad de las partes, pruebas, montos ni citas normativas específicas; si falta información, usá marcadores 【】 para indicar la información faltante y sugerí completarla.
3. El lenguaje debe ser formal, lógico y claro; los hechos y fundamentos deben exponerse por puntos.
4. Al final, indicá que se trata de un borrador generado por IA y que debe ser revisado por un abogado antes de su uso.`;

export async function draftDocument(input: DraftInput): Promise<DraftResult> {
  await requireSession();

  const docType = input.docType?.trim();
  if (!docType) {
    return {
      ok: false,
      reason: "error",
      message: "Primero seleccioná o completá el tipo de documento",
    };
  }

  const lines = [`Por favor, redactá un/a "${docType}".`];
  if (input.selfParty?.trim())
    lines.push(`Nuestra parte: ${input.selfParty.trim()}`);
  if (input.opposingParty?.trim())
    lines.push(`Parte contraria: ${input.opposingParty.trim()}`);
  if (input.background?.trim())
    lines.push(`Antecedentes del caso:\n${input.background.trim()}`);
  if (input.claims?.trim())
    lines.push(`Petición / alegación principal:\n${input.claims.trim()}`);
  if (input.extra?.trim())
    lines.push(`Información adicional:\n${input.extra.trim()}`);

  try {
    const { content } = await aiChat({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: lines.join("\n\n") },
      ],
      maxTokens: 2800,
      temperature: 0.4,
    });
    return { ok: true, content };
  } catch (err) {
    if (err instanceof AiNotConfiguredError) {
      return { ok: false, reason: "not_configured", message: err.message };
    }
    return {
      ok: false,
      reason: "error",
      message: err instanceof Error ? err.message : "Error al generar, intentá de nuevo más tarde",
    };
  }
}