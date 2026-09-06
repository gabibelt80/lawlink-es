"use client";

import { useState, useTransition } from "react";
import {
  FileText,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Scale,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveAgentsConfigAction } from "@/server/settings/ai-agents-actions";
import { cn } from "@/lib/utils";

type AgentConfig = {
  editorEnabled: boolean;
  editorModel: string;
  editorApiKey: string;
  auditorEnabled: boolean;
  auditorModel: string;
  auditorApiKey: string;
};

const AI_MODELS = [
  { value: "deepseek-chat", label: "DeepSeek Chat" },
  { value: "claude-3-5-sonnet-20241022", label: "Claude Sonnet" },
  { value: "gpt-4o-mini", label: "ChatGPT 4o Mini" },
  { value: "gpt-4o", label: "ChatGPT 4o" },
  { value: "llama3.2", label: "Llama (Ollama)" },
];

export function AiAgentsSection({
  initial,
}: {
  initial: AgentConfig;
}) {
  const [editorEnabled, setEditorEnabled] = useState(initial.editorEnabled);
  const [editorModel, setEditorModel] = useState(initial.editorModel ?? "deepseek-chat");
  const [editorApiKey, setEditorApiKey] = useState("");
  const [auditorEnabled, setAuditorEnabled] = useState(initial.auditorEnabled);
  const [auditorModel, setAuditorModel] = useState(initial.auditorModel ?? "claude-3-5-sonnet-20241022");
  const [auditorApiKey, setAuditorApiKey] = useState("");
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      try {
        await saveAgentsConfigAction({
          editorEnabled,
          editorModel,
          editorApiKey,
          auditorEnabled,
          auditorModel,
          auditorApiKey,
        });
        toast.success("Configuración de agentes guardada");
        setEditorApiKey("");
        setAuditorApiKey("");
      } catch (err) {
        toast.error("Error al guardar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  return (
    <section className="ll-surface rounded-lg border border-border p-5">
      <header className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={1.8} />
        <h2 className="text-lg">Agentes de IA especializados</h2>
      </header>

      <p className="mb-4 text-[12px] text-muted-foreground">
        Cada agente tiene su propio modelo y API key independiente.
      </p>

      <div className="space-y-4">
        {/* Agente Editor de Documentos */}
        <div className="rounded-md border border-border bg-muted/20 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="text-[13px] font-medium flex items-center gap-2">
                  Editor Legal
                  {editorEnabled && (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Activo
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Completa, modifica y edita escritos legales con los datos del caso
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditorEnabled(!editorEnabled)}
              className={cn(
                "relative h-5 w-10 shrink-0 rounded-full transition-colors",
                editorEnabled ? "bg-primary" : "bg-muted-foreground/30"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
                  editorEnabled ? "left-5" : "left-0.5"
                )}
              />
            </button>
          </div>
          
          {editorEnabled && (
            <div className="mt-3 space-y-3 pl-8">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px]">Modelo</Label>
                  <Select value={editorModel} onValueChange={setEditorModel}>
                    <SelectTrigger className="h-8 bg-background text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px]">API Key</Label>
                  <Input
                    type="password"
                    value={editorApiKey}
                    onChange={(e) => setEditorApiKey(e.target.value)}
                    placeholder="API key para este agente"
                    className="mt-1 font-mono text-xs"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Agente Auditor de Documentos */}
        <div className="rounded-md border border-border bg-muted/20 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Scale className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="text-[13px] font-medium flex items-center gap-2">
                  Auditor Legal
                  {auditorEnabled && (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Activo
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Revisa, audita y verifica que no haya errores ni faltantes en los escritos
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAuditorEnabled(!auditorEnabled)}
              className={cn(
                "relative h-5 w-10 shrink-0 rounded-full transition-colors",
                auditorEnabled ? "bg-primary" : "bg-muted-foreground/30"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
                  auditorEnabled ? "left-5" : "left-0.5"
                )}
              />
            </button>
          </div>
          
          {auditorEnabled && (
            <div className="mt-3 space-y-3 pl-8">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px]">Modelo</Label>
                  <Select value={auditorModel} onValueChange={setAuditorModel}>
                    <SelectTrigger className="h-8 bg-background text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px]">API Key</Label>
                  <Input
                    type="password"
                    value={auditorApiKey}
                    onChange={(e) => setAuditorApiKey(e.target.value)}
                    placeholder="API key para este agente"
                    className="mt-1 font-mono text-xs"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={save} disabled={isPending} className="gap-1.5">
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Guardar agentes
        </Button>
      </div>
    </section>
  );
}