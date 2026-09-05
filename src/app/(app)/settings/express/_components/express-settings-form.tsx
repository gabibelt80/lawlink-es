"use client";

import { useState, useTransition } from "react";
import { Package, CheckCircle2, Loader2, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveExpressSettingsAction } from "@/server/express/actions";

type Initial = {
  andreani: { configured: boolean; apiKeyMasked: string };
  correoArgentino: { configured: boolean; apiKeyMasked: string };
};

export function ExpressSettingsForm({ initial }: { initial: Initial }) {
  const [andreaniKey, setAndreaniKey] = useState("");
  const [correoKey, setCorreoKey] = useState("");
  const [pending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      try {
        await saveExpressSettingsAction({
          andreaniApiKey: andreaniKey,
          correoArgentinoApiKey: correoKey
        });
        toast.success("Configuración guardada");
        setAndreaniKey("");
        setCorreoKey("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error");
      }
    });
  };

  const clearAndreani = () => {
    if (!confirm("¿Eliminar API key de Andreani?")) return;
    startTransition(async () => {
      try {
        await saveExpressSettingsAction({ andreaniClearKey: true });
        toast.success("API key de Andreani eliminada");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error");
      }
    });
  };

  const clearCorreo = () => {
    if (!confirm("¿Eliminar API key de Correo Argentino?")) return;
    startTransition(async () => {
      try {
        await saveExpressSettingsAction({ correoArgentinoClearKey: true });
        toast.success("API key de Correo Argentino eliminada");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error");
      }
    });
  };

  return (
    <div className="space-y-5">
      <section className="ll-surface rounded-lg border border-border p-5">
        <header className="mb-3 flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <h2 className="text-lg">Servicios de mensajería</h2>
        </header>
        <p className="mb-4 text-[12px] text-muted-foreground">
          Dos proveedores disponibles: <span className="text-foreground/85">Andreani</span> (principal) y{" "}
          <span className="text-foreground/85">Correo Argentino</span> (alternativo).
          Configurá al menos uno para usar el seguimiento.
        </p>

        {/* Andreani */}
        <div className="mb-5 rounded-md border border-border bg-muted/20 p-4">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-[13px] font-medium">Andreani (principal)</h3>
            {initial.andreani.configured && (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Configurado
              </span>
            )}
            <a
              href="https://www.andreani.com/"
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              Solicitar
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div>
            <Label className="text-[11px]">
              API Key
              {initial.andreani.configured && (
                <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                  Actual: {initial.andreani.apiKeyMasked} (dejar vacío para conservar)
                </span>
              )}
            </Label>
            <Input
              type="password"
              value={andreaniKey}
              onChange={(e) => setAndreaniKey(e.target.value)}
              placeholder={initial.andreani.configured ? "Nueva API key si desea cambiarla" : "API key de Andreani"}
              className="mt-1 font-mono"
              autoComplete="off"
            />
          </div>
          {initial.andreani.configured && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={clearAndreani}
                className="inline-flex items-center gap-1 text-[10px] text-destructive hover:underline"
              >
                <Trash2 className="h-3 w-3" />
                Eliminar API key
              </button>
            </div>
          )}
        </div>

        {/* Correo Argentino */}
        <div className="rounded-md border border-border bg-muted/20 p-4">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-[13px] font-medium">Correo Argentino (alternativo)</h3>
            {initial.correoArgentino.configured && (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Configurado
              </span>
            )}
            <a
              href="https://www.correoargentino.com.ar/"
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              Solicitar
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div>
            <Label className="text-[11px]">
              API Key
              {initial.correoArgentino.configured && (
                <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                  Actual: {initial.correoArgentino.apiKeyMasked} (dejar vacío para conservar)
                </span>
              )}
            </Label>
            <Input
              type="password"
              value={correoKey}
              onChange={(e) => setCorreoKey(e.target.value)}
              placeholder={initial.correoArgentino.configured ? "Nueva API key si desea cambiarla" : "API key de Correo Argentino"}
              className="mt-1 font-mono"
              autoComplete="off"
            />
          </div>
          {initial.correoArgentino.configured && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={clearCorreo}
                className="inline-flex items-center gap-1 text-[10px] text-destructive hover:underline"
              >
                <Trash2 className="h-3 w-3" />
                Eliminar API key
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={save} disabled={pending} className="gap-1.5">
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Guardar configuración
          </Button>
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">
          Las API keys se cifran con AES-256-GCM y se guardan en SystemSetting.
          Nunca se muestran en texto plano.
        </p>
      </section>
    </div>
  );
}