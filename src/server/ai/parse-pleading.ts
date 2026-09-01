"use server";

/**
 * v0.11: Demanda / Solicitud - Esqueleto OCR (v0.27 extendido: compatible con PDF escaneado)
 *
 * Compatible con imágenes (jpg/png/webp) y PDF.
 * - Imágenes utilizan reconocimiento visual aiVision
 * - PDF intenta primero extracción de texto unpdf + aiChat (bajo costo, rápido)
 * - Cuando la capa de texto de PDF está vacía (documento escaneado) retroceso: unpdf renderPageAsImage renderiza las primeras 3 páginas → reconocimiento aiVision por página → fusión de resultados
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
  plaintiffs: PleadingPartyHint[]; // 起诉方/申请方
  thirdParties: PleadingPartyHint[]; // 第三人
  cause?: string;
  claimAmount?: number;
  claimDescription?: string;
  court?: string;
};

const SUPPORTED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"];
const SUPPORTED_PDF_MIME = ["application/pdf"];

const SYSTEM_PROMPT = `你是法律文书解析助手。下方图片是一份起诉状 / 申请书 / 仲裁申请书。
请严格按以下 JSON 模式Volver（仅 JSON，不要任何解释）：
{
  "plaintiffs": [{"name": "全名", "idNumber": "身份证或统一社会信用代码（可选）", "address": "可选", "legalRep": "法定代表人（公司适用，可选）", "phone": "可选"}],
  "thirdParties": [{"name": "全名", "idNumber": "可选", "address": "可选"}],
  "cause": "案由（如：买卖合同纠纷）",
  "claimAmount": 数字（元，仅金钱标的；非金钱填 null）,
  "claimDescription": "诉讼请求/申请事项要点",
  "court": "管辖法院/仲裁机构全称"
}
规则：
- 找不到的字段Volver空数组 [] 或 null，不要编造
- 起诉方包含原告 / 申请人 / 申请执行人 / 上诉人，统一放 plaintiffs
- 不要Volver被告 / 被申请人 / 被上诉人（那是用户自己）
- 金额单位统一为人民币元`;

function normalizeResult(
  parsed: Partial<ParsedPleading> | null | undefined,
): ParsedPleading {
  if (!parsed) throw new Error("AI Volver结果无法解析为 JSON");
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

// 合并多页扫描结果：当事人列表按 name 去重，标量字段取第一个非空
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
  if (!(file instanceof File)) throw new Error("缺少文件");

  const isImage = SUPPORTED_IMAGE_MIME.includes(file.type);
  const isPdf = SUPPORTED_PDF_MIME.includes(file.type);
  if (!isImage && !isPdf) {
    throw new Error(
      `仅支持 JPG / PNG / WebP / PDF，当前 ${file.type || "未知"}`,
    );
  }
  if (file.size > 20 * 1024 * 1024) throw new Error("文件超过 20MB");

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

    // PDF：先试文本层抽取（成本低）
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    const cleaned = (Array.isArray(text) ? text.join("\n") : text).trim();

    if (cleaned && cleaned.length >= 20) {
      const { content } = await aiChat({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `下方为起诉状 / 申请书的全文：\n\n${cleaned.slice(0, 12000)}`,
          },
        ],
        maxTokens: 1500,
      });
      return normalizeResult(extractJson<ParsedPleading>(content));
    }

    // v0.27: 文本层为空（扫描版 PDF）→ 渲染前 3 页为 PNG，逐页 vision 识别后合并
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
        prompt: `${SYSTEM_PROMPT}\n\n（这是扫描版起诉状 / 申请书第 ${i}/${pagesToRender} 页）`,
        maxTokens: 1500,
      });
      const parsed = extractJson<ParsedPleading>(content);
      if (parsed) pageResults.push(normalizeResult(parsed));
    }

    if (pageResults.length === 0) {
      throw new Error("扫描版 PDF 识别失败，请改传图片或检查文件");
    }
    return mergeResults(pageResults);
  } catch (err) {
    if (err instanceof AiNotConfiguredError) throw err;
    throw new Error(err instanceof Error ? err.message : "OCR 识别失败");
  }
}
