"use server";

/**
 * v0.11: Demanda / Solicitud - Esqueleto OCR (v0.27 extendido: compatible con PDF escaneado)
 *
 * Compatible con imÃ¡genes (jpg/png/webp) y PDF.
 * - Las imÃ¡genes usan reconocimiento visual aiVision
 * - El PDF primero intenta extracciÃ³n de texto con unpdf + aiChat (bajo costo, rÃ¡pido)
 * - Cuando la capa de texto del PDF estÃ¡ vacÃ­a (documento escaneado) retrocede: unpdf renderPageAsImage renderiza las primeras 3 pÃ¡ginas â†’ reconocimiento aiVision por pÃ¡gina â†’ fusiÃ³n de resultados
 */
import { requireSession } from "@/lib/auth/session";
import {
  aiChat,
  aiVision,
  extractJson,
  AiNotConfiguredError,
} from "@/lib/ai/client";
import { extractText, getDocumentProxy, renderPageAsImage } from "unpdf";

export type PleadingPartyHint = {
  name: string;
  idNumber?: string;
  address?: string;
  legalRep?: string;
  phone?: string;
};

export type ParsedPleading = {
  plaintiffs: PleadingPartyHint[]; // Demandante/solicitante
  thirdParties: PleadingPartyHint[]; // Terceros
  cause?: string;
  claimAmount?: number;
  claimDescription?: string;
  court?: string;
};

const SUPPORTED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"];
const SUPPORTED_PDF_MIME = ["application/pdf"];

const SYSTEM_PROMPT = `Sos un asistente de anÃ¡lisis de documentos legales argentinos. La imagen de abajo es una demanda / solicitud / solicitud de arbitraje.
RespondÃ© estrictamente con el siguiente formato JSON (solo JSON, sin ninguna explicaciÃ³n):
{
  "plaintiffs": [{"name": "Nombre completo", "idNumber": "DNI o CUIT (opcional)", "address": "Opcional", "legalRep": "Representante legal (aplicable para empresas, opcional)", "phone": "Opcional"}],
  "thirdParties": [{"name": "Nombre completo", "idNumber": "Opcional", "address": "Opcional"}],
  "cause": "Causa (por ejemplo: conflicto por contrato de compraventa)",
  "claimAmount": nÃºmero (en pesos argentinos, solo para monto monetario; si no es monetario, usÃ¡ null),
  "claimDescription": "Resumen de la solicitud / pretensiÃ³n principal",
  "court": "Nombre completo del tribunal o arbitraje competente"
}
Reglas:
- Si no se encuentra un campo, devolvÃ© [] o null, no inventes informaciÃ³n.
- El demandante incluye demandante / solicitante / solicitante de ejecuciÃ³n / recurrente, y debe colocarse en plaintiffs.
- No devuelvas demandado / apelado (es el usuario).
- La unidad monetaria debe ser pesos argentinos`;

function normalizeResult(
  parsed: Partial<ParsedPleading> | null | undefined,
): ParsedPleading {
  if (!parsed)
    throw new Error("El resultado de IA no se pudo analizar como JSON");
  return {
    plaintiffs: Array.isArray(parsed.plaintiffs) ? parsed.plaintiffs : [],
    thirdParties: Array.isArray(parsed.thirdParties) ? parsed.thirdParties : [],
    cause: parsed.cause ?? undefined,
    claimAmount:
      typeof parsed.claimAmount === "number" ? parsed.claimAmount : undefined,
    claimDescription: parsed.claimDescription ?? undefined,
    court: parsed.court ?? undefined,
  };
}

// Fusionar resultados de pÃ¡ginas escaneadas: las listas de partes se deduplican por nombre, los campos escalares toman el primer valor no vacÃ­o
function mergeResults(results: ParsedPleading[]): ParsedPleading {
  const seen = new Set<string>();
  const dedupe = (list: PleadingPartyHint[]) => {
    const out: PleadingPartyHint[] = [];
    for (const p of list) {
      const key = p.name?.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    return out;
  };
  return {
    plaintiffs: dedupe(results.flatMap((r) => r.plaintiffs)),
    thirdParties: dedupe(results.flatMap((r) => r.thirdParties)),
    cause: results.find((r) => r.cause)?.cause,
    claimAmount: results.find((r) => typeof r.claimAmount === "number")
      ?.claimAmount,
    claimDescription: results.find((r) => r.claimDescription)?.claimDescription,
    court: results.find((r) => r.court)?.court,
  };
}

export async function parsePleading(form: FormData): Promise<ParsedPleading> {
  await requireSession();
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("Falta el archivo");

  const isImage = SUPPORTED_IMAGE_MIME.includes(file.type);
  const isPdf = SUPPORTED_PDF_MIME.includes(file.type);
  if (!isImage && !isPdf) {
    throw new Error(
      `Solo se admiten JPG / PNG / WebP / PDF, actual: ${file.type || "Desconocido"}`,
    );
  }
  if (file.size > 20 * 1024 * 1024) throw new Error("El archivo supera 20MB");

  const buf = Buffer.from(await file.arrayBuffer());

  try {
    if (isImage) {
      const dataUrl = `data:${file.type};base64,${buf.toString("base64")}`;
      const { content } = await aiVision({
        image: { dataUrl },
        prompt: SYSTEM_PROMPT,
        maxTokens: 1500,
      });
      return normalizeResult(extractJson<ParsedPleading>(content));
    }

    // PDF: primero intenta extracciÃ³n de capa de texto (menor costo)
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    const cleaned = (Array.isArray(text) ? text.join("\n") : text).trim();

    if (cleaned && cleaned.length >= 20) {
      const { content } = await aiChat({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `A continuaciÃ³n el texto completo de la demanda / solicitud:\n\n${cleaned.slice(0, 12000)}`,
          },
        ],
        maxTokens: 1500,
      });
      return normalizeResult(extractJson<ParsedPleading>(content));
    }

    // v0.27: Capa de texto vacÃ­a (PDF escaneado) â†’ renderiza las primeras 3 pÃ¡ginas como PNG, reconocimiento visual por pÃ¡gina y fusiÃ³n
    const totalPages = pdf.numPages;
    const pagesToRender = Math.min(totalPages, 3);
    const canvasImport = () => import("@napi-rs/canvas") as Promise<any>;
    const pageResults: ParsedPleading[] = [];

    for (let i = 1; i <= pagesToRender; i++) {
      const arrayBuf = await renderPageAsImage(new Uint8Array(buf), i, {
        canvasImport,
        scale: 2.0,
      });
      const dataUrl = `data:image/png;base64,${Buffer.from(arrayBuf).toString("base64")}`;
      const { content } = await aiVision({
        image: { dataUrl },
        prompt: `${SYSTEM_PROMPT}\n\n(Esta es la pÃ¡gina ${i}/${pagesToRender} de la demanda / solicitud escaneada)`,
        maxTokens: 1500,
      });
      const parsed = extractJson<ParsedPleading>(content);
      if (parsed) pageResults.push(normalizeResult(parsed));
    }

    if (pageResults.length === 0) {
      throw new Error("Error al reconocer PDF escaneado, subÃ­ una imagen o revisÃ¡ el archivo");
    }
    return mergeResults(pageResults);
  } catch (err) {
    if (err instanceof AiNotConfiguredError) throw err;
    throw new Error(err instanceof Error ? err.message : "Error de OCR");
  }
}

