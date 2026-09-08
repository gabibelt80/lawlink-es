/**
 * v0.9.1 Cliente compatible con protocolo OpenAI
 *
 * Todas las llamadas van a {baseUrl}/chat/completions.
 * Soporta OpenAI / DeepSeek / Ollama / etc.
 *
 * server-side only (lee directamente de SystemSetting).
 */
import { getAiSettings } from "./settings";

export type ChatMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | {
      role: "user";
      content: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
    };

export interface AiChatOptions {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface AiChatResult {
  content: string;
  raw: unknown;
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super(
      "La IA no está configurada. Primero completá la clave de API en Configuración → Acceso a IA",
    );
    this.name = "AiNotConfiguredError";
  }
}

async function callOpenAiCompatible(opts: {
  apiKey: string;
  baseUrl: string;
  body: Record<string, unknown>;
  timeoutMs: number;
}): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs);
  try {
    const url = `${opts.baseUrl.replace(/\/$/, "")}/chat/completions`;
    console.error("[AI] URL:", url);
    console.error("[AI] Body:", JSON.stringify(opts.body).slice(0, 300));

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify(opts.body),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[AI] Status:", res.status);
      console.error("[AI] Response:", body.slice(0, 500));
      throw new Error(`AI error (${res.status}): ${body.slice(0, 200)}`);
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function aiChat(input: AiChatOptions): Promise<AiChatResult> {
  const s = await getAiSettings();
  if (!s.configured) throw new AiNotConfiguredError();

  const body = {
    model: input.model || s.textModel,
    messages: input.messages,
    max_tokens: input.maxTokens ?? 1500,
    temperature: input.temperature ?? 0.2,
  };

  const json = (await callOpenAiCompatible({
    apiKey: s.apiKey,
    baseUrl: s.baseUrl,
    body,
    timeoutMs: input.timeoutMs ?? 20_000,
  })) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = json.choices?.[0]?.message?.content ?? "";
  return { content, raw: json };
}

/**
 * Visión: envía base64 / dataURL / URL. El prompt guía al modelo para extraer campos.
 */
export async function aiVision(input: {
  image: { dataUrl: string } | { url: string };
  prompt: string;
  model?: string;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<AiChatResult> {
  const s = await getAiSettings();
  if (!s.configured) throw new AiNotConfiguredError();

  const imageUrl =
    "dataUrl" in input.image ? input.image.dataUrl : input.image.url;

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: imageUrl } },
        { type: "text", text: input.prompt },
      ],
    },
  ];

  return aiChat({
    messages,
    model: input.model || s.visionModel,
    maxTokens: input.maxTokens ?? 2000,
    timeoutMs: input.timeoutMs ?? 30_000,
  });
}

/**
 * Extrae JSON de la respuesta de la IA (tolera bloques ```json o texto alrededor).
 */
export function extractJson<T = unknown>(content: string): T | null {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : content;
  const match = candidate.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}