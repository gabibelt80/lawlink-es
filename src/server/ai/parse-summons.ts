"use server";

/**
 * v0.44: OCR de cÃ©dula de notificaciÃ³n judicial
 *
 * El abogado carga una imagen de la cÃ©dula â†’ aiVision extrae fecha de audiencia, hora, sala, nÃºmero de caso, juez, partes
 * Si falla, retorna campos null para que el abogado complete manualmente
 */
import { requireSession } from "@/lib/auth/session";
import { aiVision, extractJson, AiNotConfiguredError } from "@/lib/ai/client";

export type ParsedSummons = {
  hearingDate: string | null; // YYYY-MM-DD
  hearingTime: string | null; // HH:mm
  courtRoom: string | null; // Sala (ej.: Sala 3)
  caseNumber: string | null; // NÃºmero de expediente
  judge: string | null; // Nombre del juez
  parties: string[] | null; // Lista de partes
};

const SUPPORTED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

const PROMPT = `La siguiente imagen es una cÃ©dula de notificaciÃ³n judicial argentina (cÃ©dula de audiencia). DevolvÃ© estrictamente JSON:
{
  "hearingDate": "Fecha de audiencia (YYYY-MM-DD)",
  "hearingTime": "Hora de audiencia (HH:mm, formato 24h)",
  "courtRoom": "Lugar de audiencia / sala (ej.: Sala 3)",
  "caseNumber": "NÃºmero de expediente",
  "judge": "Nombre del juez",
  "parties": ["Nombre del actor/apelante", "Nombre del demandado/apelado"]
}
Reglas:
- ExtraÃ© estrictamente segÃºn el contenido de la cÃ©dula, los campos no reconocidos van null
- hearingDate debe tener formato YYYY-MM-DD
- hearingTime formato HH:mm
- parties es un array con las partes indicadas en la cÃ©dula
- Solo JSON, sin explicaciones`;

export async function parseSummons(form: FormData): Promise<ParsedSummons> {
  await requireSession();
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("Falta el archivo");
  if (!SUPPORTED.has(file.type)) {
    throw new Error(
      `Solo se admiten imÃ¡genes (JPG/PNG); formato actual: ${file.type || "desconocido"}`,
    );
  }
  if (file.size > 10 * 1024 * 1024)
    throw new Error("El archivo supera los 10 MB");

  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buf.toString("base64")}`;

  try {
    const { content } = await aiVision({
      image: { dataUrl },
      prompt: PROMPT,
      maxTokens: 500,
    });
    const parsed = extractJson<ParsedSummons>(content);
    return {
      hearingDate: parsed?.hearingDate?.trim() || null,
      hearingTime: parsed?.hearingTime?.trim() || null,
      courtRoom: parsed?.courtRoom?.trim() || null,
      caseNumber: parsed?.caseNumber?.trim() || null,
      judge: parsed?.judge?.trim() || null,
      parties: Array.isArray(parsed?.parties)
        ? parsed.parties.filter(Boolean)
        : null,
    };
  } catch (err) {
    if (err instanceof AiNotConfiguredError) throw err;
    throw new Error(err instanceof Error ? err.message : "Error al reconocer la cÃ©dula");
  }
}

