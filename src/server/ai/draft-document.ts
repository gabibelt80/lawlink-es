"use server";

/**
 * v0.28: 引导式 AI 文书起草（对照"Caso云"的填空式文书起草）
 *
 * 用户在前端以"填空式"提供：文书类型 + 我方 / 对方 + Caso背景 + 诉讼请求，
 * 这里拼成结构化提示交给 aiChat，Volver Markdown 草稿，供前端预览 / 复制 / 下载。
 *
 * 原则：仅依据用户提供的信息起草，不臆造事实、证据y具体法条编号；
 * 信息缺失处用【】占位提示补充。生成结果仅为草稿，需Abogado核校。
 */
import { requireSession } from "@/lib/auth/session";
import { aiChat, AiNotConfiguredError } from "@/lib/ai/client";

export type DraftInput = {
  docType: string; // 文书类型，如"民事起诉状"
  selfParty?: string; // 我方当事人
  opposingParty?: string; // 对方当事人
  background?: string; // Caso背景
  claims?: string; // 诉讼请求 / 核心主张
  extra?: string; // 其他补充
};

export type DraftResult =
  | { ok: true; content: string }
  | { ok: false; reason: "not_configured" | "error"; message: string };

const SYSTEM_PROMPT = `Usted es un Abogado con amplia experiencia en la redacción de diversos documentos legales.
Con base en la información brindada por el usuario, redacte un borrador de documento legal con estructura normativa y terminología profesional, en formato Markdown.
Requisitos:
1. Respetar estrictamente el formato general de este tipo de documento (datos de las partes, cuerpo, peticiones/ hechos y fundamentos, cierre, etc.).
2. Redactar únicamente con base en la información suministrada; no inventar identidad de las partes, pruebas, montos ni citas normativas específicas; si falta información, utilice marcadores 【】 para indicar la información faltante y sugerir que se complete.
3. El lenguaje debe ser formal, lógico y claro; los hechos y fundamentos deben exponerse por puntos.
4. Al final, indique que se trata de un borrador generado por IA y que debe ser revisado por un Abogado antes de su uso.`;

export async function draftDocument(input: DraftInput): Promise<DraftResult> {
  await requireSession();

  const docType = input.docType?.trim();
  if (!docType) {
    return {
      ok: false,
      reason: "error",
      message: "Primero seleccione o complete el tipo de documento",
    };
  }

  const lines = [`Por favor, redacte un/a "${docType}".`];
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
      message: err instanceof Error ? err.message : "生成Error，请稍后重试",
    };
  }
}
