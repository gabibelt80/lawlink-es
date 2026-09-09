"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Bot,
  Search,
  Loader2,
  Play,
  Pause,
  Database,
  CheckCircle2,
  Globe,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { JurisprudenceSource, JurisprudenceAgent } from "@/lib/ai-jurisprudence-agents";

export function JurisprudenceAgentsView({
  sources,
  agents,
}: {
  sources: JurisprudenceSource[];
  agents: JurisprudenceAgent[];
}) {
  const [isPending, startTransition] = useTransition();
  const [runningAgent, setRunningAgent] = useState<string | null>(null);

  function runAgent(agentId: string) {
    setRunningAgent(agentId);
    startTransition(async () => {
      try {
        // Simular búsqueda (en el futuro se integrará con la API)
        await new Promise((resolve) => setTimeout(resolve, 2000));
        toast.success("Búsqueda completada", {
          description: "Se encontraron resultados y se cargaron al sistema.",
        });
      } catch (err) {
        toast.error("Error en la búsqueda", {
          description: err instanceof Error ? err.message : "",
        });
      } finally {
        setRunningAgent(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-xl flex items-center gap-2">
          <Bot className="h-5 w-5 text-violet-500" />
          Agentes IA de Jurisprudencia
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Agentes autónomos que buscan jurisprudencia en fuentes públicas y la cargan al sistema.
        </p>
      </header>

      {/* Fuentes */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Fuentes de jurisprudencia
        </h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {sources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div>
                <div className="text-xs font-medium">{source.label}</div>
                <div className="text-[10px] text-muted-foreground">{source.url}</div>
              </div>
              {source.enabled ? (
                <Badge variant="green" className="text-[10px]">Activa</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">Inactiva</Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Agentes */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Bot className="h-4 w-4 text-violet-500" />
          Agentes configurados
        </h2>
        <div className="space-y-3">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="rounded-lg border border-border p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium">{agent.name}</h3>
                    {agent.enabled ? (
                      <Badge variant="green" className="text-[10px]">Activo</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Pausado</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{agent.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {agent.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Scale className="h-3 w-3" />
                      {agent.court}
                    </span>
                    <span>{agent.jurisdiction}</span>
                    {agent.lastRunAt && (
                      <span>Última ejecución: {new Date(agent.lastRunAt).toLocaleDateString("es-AR")}</span>
                    )}
                    {agent.resultsFound !== undefined && (
                      <span>{agent.resultsFound} resultados</span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={agent.enabled ? "outline" : "default"}
                  onClick={() => runAgent(agent.id)}
                  disabled={isPending || !agent.enabled}
                  className="gap-1.5"
                >
                  {runningAgent === agent.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : agent.enabled ? (
                    <Play className="h-3.5 w-3.5" />
                  ) : (
                    <Pause className="h-3.5 w-3.5" />
                  )}
                  {runningAgent === agent.id ? "Buscando..." : agent.enabled ? "Ejecutar" : "Pausado"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resultados */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Database className="h-4 w-4 text-emerald-500" />
          Jurisprudencia en el sistema
        </h2>
        <p className="text-xs text-muted-foreground">
          Los fallos encontrados por los agentes se cargan automáticamente en la base de jurisprudencia
          del estudio y están disponibles para búsqueda desde la sección Jurisprudencia.
        </p>
      </div>
    </div>
  );
}
