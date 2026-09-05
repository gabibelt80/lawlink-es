/**
 * v0.38: Mantenimiento de recordatorios —— disparo manual del escaneo de "recordatorios de vencimiento/audiencia".
 *
 * El cron solo se ejecuta en producción con next start, en modo dev no se dispara; esta página le da al administrador una entrada para escanear de inmediato,
 * facilitando la verificación local de que los recordatorios de audiencia/vencimiento se generen correctamente.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getWebhookSettings } from "@/server/settings/webhook";
import { ReminderScanButton } from "./_components/reminder-scan-button";
import { WebhookSettingsCard } from "./_components/webhook-settings-card";

export default async function RemindersSettingsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  const isManager =
    session.user.role === "ADMIN" || session.user.role === "PRINCIPAL_LAWYER";
  if (!isManager) redirect("/settings/profile");

  const webhook = await getWebhookSettings();

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold">Mantenimiento de recordatorios</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          El sistema escanea automáticamente todos los días a las 09:00 los vencimientos legales / audiencias, y envía notificaciones internas para los asuntos próximos (audiencias con 3 días / 1 día / el mismo día a la mañana).
          El escaneo automático solo se ejecuta en producción, en desarrollo local no se dispara — desde acá podés escanear manualmente de inmediato para verificar.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">Escanear recordatorios ahora</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">
              Escanea asuntos de audiencia y vencimiento en T-3 / T-1 / T, y envía notificaciones complementarias a los destinatarios (no se repiten las ya enviadas el mismo día).
            </div>
          </div>
          <ReminderScanButton />
        </div>
      </div>

      <WebhookSettingsCard initialEnabled={webhook.enabled} initialUrl={webhook.url} />
    </div>
  );
}