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

const PROMPT = `请识别这张中国增值税Factura图片中的信息，输出 JSON：

{
  "invoiceType": "Factura类型（如：增值税普通Factura、增值税专用Factura、电子Factura）",
  "invoiceCode": "Factura代码（如有）",
  "invoiceNumber": "Factura号码（8 位或 20 位）",
  "invoiceDate": "开票Fecha YYYY-MM-DD",
  "sellerName": "销售方Nombre",
  "sellerTaxId": "销售方纳税人识别号",
  "buyerName": "购买方Nombre",
  "buyerTaxId": "购买方纳税人识别号",
  "totalAmount": "合计Monto（数字）",
  "taxAmount": "税额（数字）",
  "totalWithTax": "价税合计（数字）",
  "items": [{"name": "ítems目Nombre", "amount": Monto数字, "taxRate": "税率字符串"}],
  "checkCode": "校验码（后 6 位）",
  "remark": "Observaciones"
}

只回复 JSON，不要其他文字。无法识别的字段填空字符串或省略。`;

export async function recognizeInvoiceFromImage(
  formData: FormData,
): Promise<
  | { ok: true; data: RecognizedInvoice; raw: string }
  | { ok: false; message: string }
> {
  const session = await requireSession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Por favor, sube la imagen de la factura" };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return {
      ok: false,
      message: `La imagen supera ${MAX_IMAGE_SIZE / 1024 / 1024} MB`,
    };
  }
  // v0.11: PDF 也允许上传，但识别效果取决于 vision 模型是否原生支持 PDF
  // 若模型不认 PDF，aiVision 会Error并Volver明确错误
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
