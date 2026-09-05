"use client";

/**
 * v0.50: Tarjeta de configuración de envío de recordatorios (bot de Telegram).
 * Todos los días a las 09:00, cuando el escaneo de vencimientos genera nuevos recordatorios, se envía un mensaje resumen al bot.
 */
import { useState, useTransition } from "react";
import { Loader2, Send, Webhook } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  saveWebhookSettingsAction,
  sendTestWebhookAction
} from "@/server/settings/webhook-actions";

export function WebhookSettingsCard({
  initialEnabled,
  initialUrl
}: {
  initialEnabled: boolean;
  initialUrl: string;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [url, setUrl] = useState(initialUrl);
  const [saving, startSaving] = useTransition();
  const [testing, startTesting] = useTransition();

  function save() {
    startSaving(async () => {
      try {
        await saveWebhookSettingsAction({ enabled, url: url.trim() });
        toast.success("Configuración de envío guardada");
      } catch (err) {
        toast.error("Error al guardar", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  function test() {
    startTesting(async () => {
      try {
        await sendTestWebhookAction();
        toast.success("Mensaje de prueba enviado, confirmá en Telegram");
      } catch (err) {
        toast.error("Error en la prueba", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Webhook className="h-4 w-4 text-primary" strokeWidth={1.8} />
        <div className="text-sm font-medium">Envío por bot de Telegram</div>
      </div>
      <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
        Cuando el escaneo diario de vencimientos encuentra nuevos recordatorios, se envía un resumen al bot de Telegram (solo incluye títulos de asuntos y números de caso, sin datos de las partes).
        Creá un bot con @BotFather en Telegram y pegá la URL del webhook abajo.
        Podés obtener la URL usando el token del bot y tu chat_id.
      </p>

      <div className="mt-3 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">URL del webhook de Telegram</Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>&text="
            className="font-mono text-[12px]"
          />
        </div>
        <label className="flex items-center gap-2 text-[12.5px]">
          <Checkbox checked={enabled} onCheckedChange={(v) => setEnabled(v === true)} />
          Activar envío diario de recordatorios
        </label>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={save} disabled={saving} className="h-8 gap-1.5">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Guardar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={test}
            disabled={testing}
            className="h-8 gap-1.5"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Enviar mensaje de prueba
          </Button>
        </div>
      </div>
    </div>
  );
}