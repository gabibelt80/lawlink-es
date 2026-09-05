"use server";

/**
 * v0.28: RedacciÃ³n guiada de documentos con IA (similar a la redacciÃ³n por formulario de "Caso cloud")
 *
 * El usuario completa en el frontend: tipo de documento + nuestra parte / contraparte + antecedentes del caso + pretensiones,
 * aquÃ­ se arma un prompt estructurado para aiChat, devuelve borrador en Markdown para previsualizar / copiar / descargar.
 *
 * Principio: solo redacta segÃºn la informaciÃ³n proporcionada por el usuario, no inventa hechos, pruebas ni nÃºmeros de artÃ­culos especÃ­ficos;
 * la informaciÃ³n faltante se indica con marcadores ã€ã€‘. El resultado es solo un borrador, debe ser revisado por un abogado.
 */
import { requireSession } from "@/lib/auth/session";
import { aiChat, AiNotConfiguredError } from "@/lib/ai/client";

export type DraftInput = {
  docType: string; // Tipo de documento, ej.: "Demanda civil"
  selfParty?: string; // Nuestra parte
  opposingParty?: string; // Parte contraria
  background?: string; // Antecedentes del caso
  claims?: string; // PretensiÃ³n / alegaciÃ³n principal
  extra?: string; // InformaciÃ³n adicional
};

export type DraftResult =
  | { ok: true; content: string }
  | { ok: false; reason: "not_configured" | "error"; message: string };

const SYSTEM_PROMPT = `Sos un abogado con amplia experiencia en la redacciÃ³n de documentos legales argentinos.
SegÃºn la informaciÃ³n brindada por el usuario, redactÃ¡ un borrador de documento legal con estructura normativa y terminologÃ­a profesional, en formato Markdown.
Requisitos:
1. RespetÃ¡ estrictamente el formato general de este tipo de documento (datos de las partes, cuerpo, peticiones/hechos y fundamentos, cierre, etc.).
2. RedactÃ¡ Ãºnicamente con base en la informaciÃ³n suministrada; no inventes identidad de las partes, pruebas, montos ni citas normativas especÃ­ficas; si falta informaciÃ³n, usÃ¡ marcadores ã€ã€‘ para indicar la informaciÃ³n faltante y sugerÃ­ completarla.
3. El lenguaje debe ser formal, lÃ³gico y claro; los hechos y fundamentos deben exponerse por puntos.
4. Al final, indicÃ¡ que se trata de un borrador generado por IA y que debe ser revisado por un abogado antes de su uso.`;

export async function draftDocument(input: DraftInput): Promise<DraftResult> {
  await requireSession();

  const docType = input.docType?.trim();
  if (!docType) {
    return {
      ok: false,
      reason: "error",
      message: "Primero seleccionÃ¡ o completÃ¡ el tipo de documento",
    };
  }

  const lines = [`Por favor, redactÃ¡ un/a "${docType}".`];
  if (input.selfParty?.trim())
    lines.push(`Nuestra parte: ${input.selfParty.trim()}`);
  if (input.opposingParty?.trim())
    lines.push(`Parte contraria: ${input.opposingParty.trim()}`);
  if (input.background?.trim())
    lines.push(`Antecedentes del caso:\n${input.background.trim()}`);
  if (input.claims?.trim())
    lines.push(`PeticiÃ³n / alegaciÃ³n principal:\n${input.claims.trim()}`);
  if (input.extra?.trim())
    lines.push(`InformaciÃ³n adicional:\n${input.extra.trim()}`);

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
      message: err instanceof Error ? err.message : "Error al generar, intentÃ¡ de nuevo mÃ¡s tarde",
    };
  }
}

