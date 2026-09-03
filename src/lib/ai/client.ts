/**
 * v0.9.1 OpenAI å…¼å®¹åè®®å°è£…
 *
 * æ‰€æœ‰è°ƒç”¨èµ° {baseUrl}/chat/completionsã€‚
 * æ”¯æŒ OpenAI / é€šä¹‰ / DeepSeek / Kimi / æ™ºè°± / OpenRouter / Ollama etc.ã€‚
 *
 * server-side onlyï¼ˆç›´æŽ¥è¯» SystemSettingï¼‰ã€‚
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
  model?: string; // è¦†ç›–é»˜è®¤ textModel
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
      "La IA no estÃ¡ configurada. Primero completÃ¡ la clave de API en ConfiguraciÃ³n â†’ Acceso a IA",
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
    const res = await fetch(
      `${opts.baseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${opts.apiKey}`,
        },
        body: JSON.stringify(opts.body),
        signal: ctrl.signal,
      },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AI è¯·æ±‚Error (${res.status}): ${body.slice(0, 200)}`);
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
 * è§†è§‰è¯†åˆ«ï¼šä¼  base64 / dataURL / URL ä¸‰é€‰ä¸€ï¼Œprompt å¼•å¯¼æ¨¡åž‹æŠ½å­—æ®µã€‚
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
 * ä»Ž AI Volveræ–‡æœ¬ä¸­æå– JSONï¼ˆå®¹é”™ï¼š``` åŒ…è£¹ã€å‰åŽæœ‰è§£é‡Šæ–‡å­—å‡èƒ½æŠ½å‡ºï¼‰ã€‚
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

