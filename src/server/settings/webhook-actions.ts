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
    .refine((v) => v === "" || v.startsWith("https://"), "Solo se admite HTTPS para la URL del bot")
});

async function requireManager() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("Solo el Administrador / Abogado Principal puede configurar el envío de recordatorios");
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
  if (data.enabled && !data.url) throw new Error("Para activar el envío necesitás completar la URL del bot");

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
    `LawLink - Mensaje de prueba: El envío de recordatorios está configurado correctamente (Iniciado por: ${session.user.name ?? session.user.email})`
  );
  if (result.skipped) throw new Error("El envío no está habilitado o no configuraste la URL del bot");
  if (!result.ok) throw new Error(`Error de envío: ${result.error ?? "Error desconocido"}`);
  return { ok: true };
}