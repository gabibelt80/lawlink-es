"use server";

/**
 * v0.27: OCR de etiqueta de envÃ­o
 *
 * El abogado sube una foto de la etiqueta de envÃ­o â†’ aiVision extrae el nÃºmero de seguimiento + nombre de la empresa (si se puede reconocer)
 * Ante error devuelve vacÃ­o para que el abogado ingrese manualmente
 */
import { requireSession } from "@/lib/auth/session";
import { aiVision, extractJson, AiNotConfiguredError } from "@/lib/ai/client";

export type ParsedExpressLabel = {
  trackingNo: string | null;
  companyCode: string | null; // Nombre de la empresa (Andreani / Correo Argentino / OCA, etc.)
};

const SUPPORTED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

const PROMPT = `La siguiente imagen es una foto de una etiqueta de envÃ­o. DevolvÃ© estrictamente JSON:
{"trackingNo": "NÃºmero de seguimiento", "companyCode": "Nombre de la empresa de mensajerÃ­a argentina (ej.: Andreani / Correo Argentino / OCA / Pickit)"}
Reglas:
- trackingNo es el nÃºmero de seguimiento mÃ¡s visible de la etiqueta, combinaciÃ³n alfanumÃ©rica de 10-30 caracteres
- Si no encontrÃ¡s algÃºn dato devolvÃ© null, no inventes
- Solo JSON, sin explicaciones`;

export async function parseExpressLabel(
  form: FormData,
): Promise<ParsedExpressLabel> {
  await requireSession();
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("Falta el archivo");
  if (!SUPPORTED.has(file.type)) {
    throw new Error(
      `Solo se admiten imÃ¡genes (JPG/PNG/WebP); actual: ${file.type || "desconocido"}`,
    );
  }
  if (file.size > 10 * 1024 * 1024) throw new Error("El archivo supera 10 MB");

  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buf.toString("base64")}`;

  try {
    const { content } = await aiVision({
      image: { dataUrl },
      prompt: PROMPT,
      maxTokens: 300,
    });
    const parsed = extractJson<ParsedExpressLabel>(content);
    return {
      trackingNo: parsed?.trackingNo?.trim() || null,
      companyCode: parsed?.companyCode?.trim() || null,
    };
  } catch (err) {
    if (err instanceof AiNotConfiguredError) throw err;
    throw new Error(
      err instanceof Error
        ? err.message
        : "No se pudo reconocer la etiqueta de envÃ­o",
    );
  }
}

