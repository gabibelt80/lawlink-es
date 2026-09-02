"use server";

import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { aiVision, extractJson, AiNotConfiguredError } from "@/lib/ai/client";

const MAX_IMAGE_SIZE = 6 * 1024 * 1024; // 6MB

export interface RecognizedInvoice {
  invoiceType?: string;
  invoiceCode?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  sellerName?: string;
  sellerTaxId?: string;
  buyerName?: string;
  buyerTaxId?: string;
  totalAmount?: number;
  taxAmount?: number;
  totalWithTax?: number;
  items?: { name: string; amount: number; taxRate?: string }[];
  checkCode?: string;
  remark?: string;
}

const PROMPT = `Reconocé la información de esta imagen de factura argentina y devolvé JSON:

{
  "invoiceType": "Tipo de factura (ej.: Factura A, Factura B, Factura C, Factura electrónica)",
  "invoiceCode": "Código de factura (si tiene)",
  "invoiceNumber": "Número de factura",
  "invoiceDate": "Fecha de emisión YYYY-MM-DD",
  "sellerName": "Nombre del vendedor",
  "sellerTaxId": "CUIT del vendedor",
  "buyerName": "Nombre del comprador",
  "buyerTaxId": "CUIT del comprador",
  "totalAmount": "Monto total (número)",
  "taxAmount": "Monto de impuestos (número)",
  "totalWithTax": "Total con impuestos (número)",
  "items": [{"name": "Nombre del ítem", "amount": Monto numérico, "taxRate": "Tasa de impuesto como texto"}],
  "checkCode": "Código de verificación (últimos 6 dígitos)",
  "remark": "Observaciones"
}

Respondé solo JSON, sin texto adicional. Los campos no reconocidos van vacíos u omitidos.`;

export async function recognizeInvoiceFromImage(
  formData: FormData,
): Promise<
  | { ok: true; data: RecognizedInvoice; raw: string }
  | { ok: false; message: string }
> {
  const session = await requireSession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Por favor, subí la imagen de la factura" };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return {
      ok: false,
      message: `La imagen supera ${MAX_IMAGE_SIZE / 1024 / 1024} MB`,
    };
  }
  // v0.11: PDF también permitido, pero el reconocimiento depende de si el modelo de visión soporta PDF nativamente
  // Si el modelo no reconoce PDF, aiVision devolverá un error claro
  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";
  if (!isImage && !isPdf) {
    return { ok: false, message: "Solo se admiten imágenes o PDF" };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buf.toString("base64")}`;

  try {
    const res = await aiVision({
      image: { dataUrl },
      prompt: PROMPT,
      timeoutMs: 30_000,
    });

    const data = extractJson<RecognizedInvoice>(res.content) ?? {};

    await audit({
      userId: session.user.id,
      action: "AI_INVOICE_OCR",
      targetType: "FeeEntry",
      targetId: "scratch",
      detail: {
        ok: true,
        fileName: file.name,
        size: file.size,
        invoiceNumber: data.invoiceNumber ?? null,
      },
    });

    return { ok: true, data, raw: res.content };
  } catch (e) {
    if (e instanceof AiNotConfiguredError) {
      return { ok: false, message: e.message };
    }
    return {
      ok: false,
      message:
        e instanceof Error ? e.message : "No se pudo reconocer la imagen",
    };
  }
}