"use client";

import { useState, useTransition } from "react";
import { Package, CheckCircle2, Loader2, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveExpressSettingsAction } from "@/server/express/actions";

type Initial = {
  kdniao: { ebusinessId: string; configured: boolean; appKeyMasked: string };
  kuaidi100: { customer: string; configured: boolean; keyMasked: string };
};

export function ExpressSettingsForm({ initial }: { initial: Initial }) {
  const [kdEbId, setKdEbId] = useState(initial.kdniao.ebusinessId);
  const [kdAppKey, setKdAppKey] = useState("");
  const [k100Customer, setK100Customer] = useState(initial.kuaidi100.customer);
  const [k100Key, setK100Key] = useState("");
  const [pending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      try {
        await saveExpressSettingsAction({
          kdniaoEbusinessId: kdEbId,
          kdniaoAppKey: kdAppKey,
          kuaidi100Customer: k100Customer,
          kuaidi100Key: k100Key
        });
        toast.success("Configuración guardada");
        setKdAppKey("");
        setK100Key("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error");
      }
    });
  };

  const clearKdniao = () => {
    if (!confirm("¿Borrar la clave de Andreani?")) return;
    startTransition(async () => {
      try {
        await saveExpressSettingsAction({ kdniaoClearKey: true });
        toast.success("Eliminada");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error");
      }
    });
  };

  const clearKd100 = () => {
    if (!confirm("¿Borrar la clave de Correo Argentino?")) return;
    startTransition(async () => {
      try {
        await saveExpressSettingsAction({ kuaidi100ClearKey: true });
        toast.success("Eliminada");
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
          <h2 className="text-lg">Integración de envíos</h2>
        </header>
        <p className="mb-4 text-[12px] text-muted-foreground">
          Doble proveedor: prioridad <span className="text-foreground/85">Andreani</span> (cobertura nacional),
          ante error se degrada a <span className="text-foreground/85">Correo Argentino</span>.
          Con configurar cualquiera de los dos ya se puede usar.
        </p>

        {/* Andreani */}
        <div className="mb-5 rounded-md border border-border bg-muted/20 p-4">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-[13px] font-medium">Andreani (principal, recomendado)</h3>
            {initial.kdniao.configured && (
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label className="text-[11px]">API Key (clave pública)</Label>
              <Input
                value={kdEbId}
                onChange={(e) => setKdEbId(e.target.value)}
                placeholder="API Key"
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-[11px]">
                API Secret (clave privada)
                {initial.kdniao.configured && (
                  <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                    Actual {initial.kdniao.appKeyMasked} (dejar vacío para conservar)
                  </span>
                )}
              </Label>
              <Input
                type="password"
                value={kdAppKey}
                onChange={(e) => setKdAppKey(e.target.value)}
                placeholder={initial.kdniao.configured ? "Pegá una nueva API Secret si querés cambiarla" : "API Secret"}
                className="mt-1 font-mono"
                autoComplete="off"
              />
            </div>
          </div>
          {initial.kdniao.configured && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={clearKdniao}
                className="inline-flex items-center gap-1 text-[10px] text-destructive hover:underline"
              >
                <Trash2 className="h-3 w-3" />
                Borrar API Secret
              </button>
            </div>
          )}
        </div>

        {/* Correo Argentino */}
        <div className="rounded-md border border-border bg-muted/20 p-4">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-[13px] font-medium">Correo Argentino (respaldo)</h3>
            {initial.kuaidi100.configured && (
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label className="text-[11px]">Usuario (código de cliente)</Label>
              <Input
                value={k100Customer}
                onChange={(e) => setK100Customer(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-[11px]">
                Contraseña
                {initial.kuaidi100.configured && (
                  <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                    Actual {initial.kuaidi100.keyMasked} (dejar vacío para conservar)
                  </span>
                )}
              </Label>
              <Input
                type="password"
                value={k100Key}
                onChange={(e) => setK100Key(e.target.value)}
                placeholder={initial.kuaidi100.configured ? "Pegá una nueva contraseña si querés cambiarla" : "Contraseña"}
                className="mt-1 font-mono"
                autoComplete="off"
              />
            </div>
          </div>
          {initial.kuaidi100.configured && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={clearKd100}
                className="inline-flex items-center gap-1 text-[10px] text-destructive hover:underline"
              >
                <Trash2 className="h-3 w-3" />
                Borrar contraseña
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
          Las claves se guardan cifradas de forma segura en el sistema. El frontend nunca muestra el texto plano.
        </p>
      </section>
    </div>
  );
}