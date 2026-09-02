"use client";

/**
 * v0.50: Tarjeta de configuración de envío de recordatorios (robot de grupo de WeChat Empresarial / DingTalk).
 * Todos los días a las 09:00, cuando el escaneo de vencimientos genera nuevos recordatorios, se envía un mensaje resumen al robot.
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
        toast.success("Mensaje de prueba enviado, confirmá en el grupo");
      } catch (err) {
        toast.error("Error en la prueba", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Webhook className="h-4 w-4 text-primary" strokeWidth={1.8} />
        <div className="text-sm font-medium">Envío por robot de grupo (WeChat Empresarial / DingTalk)</div>
      </div>
      <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
        Cuando el escaneo diario de vencimientos encuentra nuevos recordatorios, se envía un resumen al robot del grupo (solo incluye títulos de asuntos y números de caso, sin datos de las partes).
        Agregá un «robot personalizado» en el grupo de WeChat Empresarial / DingTalk y pegá la dirección Webhook abajo;
        para el robot de DingTalk se recomienda usar la configuración de seguridad de «palabra clave personalizada» y completar <code className="font-mono">LawLink</code>.
      </p>

      <div className="mt-3 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Dirección Webhook del robot</Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=... o https://oapi.dingtalk.com/robot/send?access_token=..."
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