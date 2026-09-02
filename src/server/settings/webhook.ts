/**
 * v0.50: Configuración de webhook de recordatorios (bot de Telegram).
 *
 * Una sola clave SystemSetting `notifyWebhook`.
 * La URL del webhook es la de la API de Telegram:
 * https://api.telegram.org/bot<TOKEN>/sendMessage
 * El cuerpo se envía como JSON: { chat_id: "<CHAT_ID>", text: "..." }
 * Se usa el mismo patrón de «clave única + lectura/escritura tipada» que firm-profile.
 */
import { prisma } from "@/lib/prisma";

const WEBHOOK_KEY = "notifyWebhook";

export interface WebhookSettings {
  enabled: boolean;
  url: string;
}

export const WEBHOOK_DEFAULTS: WebhookSettings = {
  enabled: false,
  url: ""
};

export async function getWebhookSettings(): Promise<WebhookSettings> {
  const row = await prisma.systemSetting.findUnique({ where: { key: WEBHOOK_KEY } });
  const s = (row?.value as Partial<WebhookSettings> | null) ?? {};
  return {
    enabled: s.enabled ?? WEBHOOK_DEFAULTS.enabled,
    url: typeof s.url === "string" ? s.url : WEBHOOK_DEFAULTS.url
  };
}

export async function saveWebhookSettings(next: WebhookSettings): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: WEBHOOK_KEY },
    create: { key: WEBHOOK_KEY, value: { ...next } },
    update: { value: { ...next } }
  });
}

const WEBHOOK_TIMEOUT_MS = 8000;

/**
 * Envía un mensaje de texto al webhook configurado. Si no está habilitado o configurado, se omite silenciosamente (devuelve skipped).
 * No lanza excepciones: el error de envío de recordatorios no debe afectar el flujo principal, el motivo se devuelve para que el llamador lo registre.
 */
export async function sendWebhookText(
  content: string
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const settings = await getWebhookSettings();
  if (!settings.enabled || !settings.url) return { ok: false, skipped: true };

  let url: URL;
  try {
    url = new URL(settings.url);
    if (url.protocol !== "https:") throw new Error("Solo se admite HTTPS");
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "URL de webhook inválida" };
  }

  // Extraer chat_id de la URL si está presente
  const chatId = url.searchParams.get("chat_id") ?? "";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: content,
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    // Telegram devuelve { ok: true, result: {...} } cuando tiene éxito
    const data = (await response.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
    if (data && data.ok === false) {
      return { ok: false, error: data.description ?? "Error de Telegram" };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de solicitud" };
  } finally {
    clearTimeout(timer);
  }
}