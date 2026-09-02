"use client";

import { useState, useTransition } from "react";
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveYuandianSettingsAction,
  clearYuandianKeyAction,
  testYuandianConnection
} from "@/server/settings/yuandian-actions";

type Initial = {
  configured: boolean;
  baseUrl: string;
  caseDetailHost: string;
  apiKeyMasked: string;
};

export function YuandianSettingsForm({
  initial,
  defaults
}: {
  initial: Initial;
  defaults: { baseUrl: string; caseDetailHost: string };
}) {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl || defaults.baseUrl);
  const [caseDetailHost, setCaseDetailHost] = useState(
    initial.caseDetailHost || defaults.caseDetailHost
  );
  const [pending, startTransition] = useTransition();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const save = () => {
    startTransition(async () => {
      try {
        await saveYuandianSettingsAction({ apiKey, baseUrl, caseDetailHost });
        toast.success("Configuración de Yuandian guardada");
        setApiKey("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  };

  const clearKey = () => {
    if (!confirm("¿Confirmás que querés borrar la API key de Yuandian? La búsqueda de casos similares dejará de funcionar.")) return;
    startTransition(async () => {
      try {
        await clearYuandianKeyAction({ confirm: true });
        toast.success("API key de Yuandian eliminada");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error");
      }
    });
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testYuandianConnection();
      setTestResult({ ok: res.ok, msg: res.message ?? "" });
    } catch (e) {
      setTestResult({ ok: false, msg: e instanceof Error ? e.message : "Error de red" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <section className="ll-surface rounded-lg border border-border p-5">
      <header className="mb-3 flex items-center gap-2">
        <Scale className="h-4 w-4 text-primary" strokeWidth={1.8} />
        <h2 className="text-lg">API de base de casos Yuandian</h2>
        {initial.configured && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Configurada
          </span>
        )}
      </header>

      <p className="mb-4 text-[12px] text-muted-foreground">
        API de búsqueda de jurisprudencia de la plataforma abierta Yuandian (chineselaw.com). Una vez configurada, se habilita:
        <span className="text-foreground/85"> Detalle del caso → pestaña Casos similares → búsqueda de casos similares</span>.
        Se factura por consulta (caso común: 10 POINT/consulta).
      </p>

      <div className="space-y-3">
        <div>
          <Label className="text-[11px]">
            API Key
            {initial.configured && (
              <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                Actual: {initial.apiKeyMasked} (dejar vacío para conservar el valor actual)
              </span>
            )}
          </Label>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={initial.configured ? "Pegá una nueva key si querés cambiarla" : "Pegá la API key de Yuandian"}
            className="mt-1 font-mono"
            autoComplete="off"
          />
        </div>

        <div>
          <Label className="text-[11px]">API Base URL</Label>
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={defaults.baseUrl}
            className="mt-1 font-mono text-[12px]"
          />
        </div>

        <div>
          <Label className="text-[11px]">Dominio frontend de detalle de casos</Label>
          <Input
            value={caseDetailHost}
            onChange={(e) => setCaseDetailHost(e.target.value)}
            placeholder={defaults.caseDetailHost}
            className="mt-1 font-mono text-[12px]"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Se usa para el enlace externo de «Ver texto completo» y para distinguir la URL de la API
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button onClick={save} disabled={pending} className="gap-1.5">
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Guardar configuración
        </Button>
        <Button
          variant="outline"
          onClick={runTest}
          disabled={testing || !initial.configured}
          className="gap-1.5"
        >
          {testing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Probar conexión (descuenta 10 POINT)
        </Button>
        {initial.configured && (
          <Button
            variant="ghost"
            onClick={clearKey}
            disabled={pending}
            className="ml-auto gap-1 text-destructive"
          >
            <Trash2 className="h-3 w-3" />
            Borrar key
          </Button>
        )}
      </div>

      {testResult && (
        <div
          className={
            "mt-3 flex items-start gap-2 rounded-md border p-3 text-[12px] " +
            (testResult.ok
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800"
              : "border-destructive/30 bg-destructive/10 text-destructive")
          }
        >
          {testResult.ok ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <span>{testResult.msg}</span>
        </div>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground">
        Solicitar key:
        <a
          href="https://open.chineselaw.com"
          target="_blank"
          rel="noreferrer"
          className="ml-1 inline-flex items-center gap-1 text-primary hover:underline"
        >
          Plataforma abierta Yuandian
          <ExternalLink className="h-3 w-3" />
        </a>
      </p>
    </section>
  );
}