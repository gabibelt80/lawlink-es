"use client";

import { useState, useTransition } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveAiSettingsAction,
  clearAiKeyAction,
  testAiConnection,
} from "@/server/settings/ai-actions";

type Initial = {
  configured: boolean;
  baseUrl: string;
  textModel: string;
  visionModel: string;
  apiKeyMasked: string;
};

const PROVIDER_PRESETS = [
  {
    name: "Tongyi Qianwen (recomendado)",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    text: "qwen-turbo",
    vision: "qwen-vl-max",
    apply: "Obtené la clave desde la consola de Alibaba Bailian",
    link: "https://bailian.console.aliyun.com/",
  },
  {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    text: "deepseek-v4-flash",
    vision: "deepseek-v4-flash",
    apply: "Obtené la clave en la plataforma de DeepSeek",
    link: "https://platform.deepseek.com/api_keys",
  },
  {
    name: "Moonshot Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    text: "moonshot-v1-8k",
    vision: "moonshot-v1-8k-vision-preview",
    apply: "Obtené la clave en la plataforma de Moonshot",
    link: "https://platform.moonshot.cn/",
  },
  {
    name: "Zhipu GLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    text: "glm-4-flash",
    vision: "glm-4v",
    apply: "Obtené la clave en la plataforma abierta de Zhipu",
    link: "https://open.bigmodel.cn/",
  },
  {
    name: "Ollama local",
    baseUrl: "http://localhost:11434/v1",
    text: "qwen2.5:7b",
    vision: "llava:7b",
    apply: "Iniciá Ollama en tu máquina y usalo directamente, sin clave",
    link: "https://ollama.com/",
  },
] as const;

export function AiSettingsForm({
  initial,
  defaults,
}: {
  initial: Initial;
  defaults: { baseUrl: string; textModel: string; visionModel: string };
}) {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl || defaults.baseUrl);
  const [textModel, setTextModel] = useState(
    initial.textModel || defaults.textModel,
  );
  const [visionModel, setVisionModel] = useState(
    initial.visionModel || defaults.visionModel,
  );
  const [pending, startTransition] = useTransition();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  const applyPreset = (p: (typeof PROVIDER_PRESETS)[number]) => {
    setBaseUrl(p.baseUrl);
    setTextModel(p.text);
    setVisionModel(p.vision);
    toast.info(`Se aplicó la configuración predeterminada de ${p.name}, completá la API key correspondiente`);
  };

  const save = () => {
    startTransition(async () => {
      try {
        await saveAiSettingsAction({
          apiKey,
          baseUrl,
          textModel,
          visionModel,
        });
        toast.success("Configuración guardada");
        setApiKey(""); // No persistir la key en el frontend
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  };

  const clearKey = () => {
    if (!confirm("¿Confirmás que querés borrar la API key guardada? Todas las funciones que dependen de IA dejarán de funcionar."))
      return;
    startTransition(async () => {
      try {
        await clearAiKeyAction({ confirm: true });
        toast.success("API key eliminada");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error");
      }
    });
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testAiConnection();
      if (res.ok) {
        setTestResult({ ok: true, msg: `Conexión exitosa, el modelo respondió: "${res.reply}"` });
      } else {
        setTestResult({ ok: false, msg: res.message ?? "Error desconocido" });
      }
    } catch (e) {
      setTestResult({
        ok: false,
        msg: e instanceof Error ? e.message : "Error de red",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="ll-surface rounded-lg border border-border p-5">
        <header className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.8} />
          <h2 className="text-lg">Integración de IA</h2>
          {initial.configured && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> Configurada
            </span>
          )}
        </header>

        <p className="mb-4 text-[12px] text-muted-foreground">
          Usa protocolo compatible con OpenAI y admite cualquier endpoint compatible. Una vez configurada, podés habilitar:
          <span className="text-foreground/85">
            {" "}
            OCR de facturas · Análisis mejorado de SMS judiciales con IA
          </span>
          (los módulos posteriores también reutilizarán la misma configuración)
        </p>

        {/* Presets de proveedores */}
        <div className="mb-4">
          <Label className="text-[11px]">Presets rápidos</Label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PROVIDER_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => applyPreset(p)}
                className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

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
              placeholder={
                initial.configured ? "Pegá una nueva key si querés cambiarla" : "Pegá la API key"
              }
              className="mt-1 font-mono"
              autoComplete="off"
            />
          </div>

          <div>
            <Label className="text-[11px]">Base URL</Label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={defaults.baseUrl}
              className="mt-1 font-mono text-[12px]"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label className="text-[11px]">Modelo de texto</Label>
              <Input
                value={textModel}
                onChange={(e) => setTextModel(e.target.value)}
                placeholder={defaults.textModel}
                className="mt-1 font-mono text-[12px]"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Se usa para análisis de SMS judiciales con IA, etc.
              </p>
            </div>
            <div>
              <Label className="text-[11px]">Modelo visual</Label>
              <Input
                value={visionModel}
                onChange={(e) => setVisionModel(e.target.value)}
                placeholder={defaults.visionModel}
                className="mt-1 font-mono text-[12px]"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Se usa para OCR de facturas, etc.
              </p>
            </div>
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
            Probar conexión
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
      </section>

      <section className="ll-surface rounded-lg border border-border p-5">
        <h3 className="mb-3 text-base">Obtener API key</h3>
        <ul className="space-y-2 text-[12px]">
          {PROVIDER_PRESETS.map((p) => (
            <li key={p.name} className="flex items-baseline gap-3">
              <span className="w-28 shrink-0 text-foreground/85">{p.name}</span>
              <span className="text-muted-foreground">{p.apply}</span>
              <a
                href={p.link}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-primary hover:underline"
              >
                Abrir
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">
          La clave se guarda cifrada con AES-256-GCM en SystemSetting y el cifrado de documentos reutiliza la misma clave (
          <span className="font-mono">STORAGE_ENCRYPTION_KEY</span>
          ). El frontend nunca muestra la key en texto plano.
        </p>
      </section>
    </div>
  );
}