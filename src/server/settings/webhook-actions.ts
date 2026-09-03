"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import {
  getWebhookSettings,
  saveWebhookSettings,
  sendWebhookText
} from "./webhook";

const saveSchema = z.object({
  enabled: z.boolean(),
  url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || v.startsWith("https://"), "ä»…æ”¯æŒ HTTPS çš„æœºå™¨äººåœ°å€")
});

async function requireManager() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("ä»…Administrarå‘˜ / ä¸»ä»»Abogadoå¯é…ç½®RecordatoriosæŽ¨é€");
  }
  return session;
}

export async function getWebhookSettingsAction() {
  await requireManager();
  return getWebhookSettings();
}

export async function saveWebhookSettingsAction(input: z.infer<typeof saveSchema>) {
  const session = await requireManager();
  const data = saveSchema.parse(input);
  if (data.enabled && !data.url) throw new Error("å¯ç”¨æŽ¨é€éœ€è¦å¡«å†™æœºå™¨äººåœ°å€");

  await saveWebhookSettings({ enabled: data.enabled, url: data.url });
  await audit({
    userId: session.user.id,
    action: "WEBHOOK_SETTINGS_SAVE",
    targetType: "SystemSetting",
    targetId: "notifyWebhook",
    detail: { enabled: data.enabled, hasUrl: Boolean(data.url) }
  });
  revalidatePath("/settings/reminders");
  return { ok: true };
}

export async function sendTestWebhookAction() {
  const session = await requireManager();
  const result = await sendWebhookText(
    `LawLink æµ‹è¯•æ¶ˆæ¯ï¼šRecordatoriosæŽ¨é€é…ç½®æˆåŠŸï¼ˆIniciado porï¼š${session.user.name ?? session.user.email}ï¼‰`
  );
  if (result.skipped) throw new Error("æŽ¨é€æœªå¯ç”¨æˆ–æœªé…ç½®æœºå™¨äººåœ°å€");
  if (!result.ok) throw new Error(`å‘é€Errorï¼š${result.error ?? "Desconocidoé”™è¯¯"}`);
  return { ok: true };
}


