"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AgentsConfig } from "./agents-config";
import {
  Upload,
  Download,
  Loader2,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  RefreshCw,
  Database,
  Clock,
  Bot,
  Activity,
  CircleDot,
  CircleOff,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  importJurisprudenceBatch,
  exportJurisprudence,
} from "@/server/jurisprudence/actions";

type Stats = {
  totalFallos: number;
  totalFuentes: number;
  totalAgentes: number;
  cronEnabled: boolean;
  lastRunAt: string | null;
  lastRunNew: number;
  lastRunStatus: string | null;
};

type AgentCfg = {
  id: string;
  keywords: string[];
  maxPages: number;
  pageSize: number;
  enabled: boolean;
};

type LogRow = {
  id: string;
  source: string;
  query: string;
  agentId: string | null;
  totalFound: number;
  totalNew: number;
  totalSkip: number;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  error: string | null;
};

export function JurisprudenceAdminView() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<unknown[] | null>(null);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [stats, setStats] = useState<Stats | null>(null);
  const [agents, setAgents] = useState<AgentCfg[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningIngest, setRunningIngest] = useState(false);

  async function loadAll() {
    try {
      const {
        getAdminJurisprudenceStats,
        getAdminJurisprudenceAgents,
        getAdminJurisprudenceLogs,
      } = await import("@/server/jurisprudence/actions");

      const [s, a, l] = await Promise.all([
        getAdminJurisprudenceStats(),
        getAdminJurisprudenceAgents(),
        getAdminJurisprudenceLogs(20),
      ]);

      setStats(s);
      setAgents(a);
      setLogs(l);
    } catch (err) {
      console.error("Error cargando admin jurisprudence:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleTriggerIngest() {
    setRunningIngest(true);
    try {
      const { triggerJurisprudenceIngestNow } = await import(
        "@/server/jurisprudence/actions"
      );
      const result = await triggerJurisprudenceIngestNow();

      if (!result.ok) {
        toast.error("Error en la ingesta", {
          description: result.error || "Error desconocido",
        });
        return;
      }

      toast.success(`Ingesta completada: ${result.saved} nuevos fallos`, {
        description: `Total: ${result.total} | Nuevos: ${result.saved} | Existentes: ${result.skipped}`,
      });

      await loadAll();
    } catch (err) {
      toast.error("Error", {
        description: err instanceof Error ? err.message : "",
      });
    } finally {
      setRunningIngest(false);
    }
  }

  async function handleToggleCron(enabled: boolean) {
    try {
      const { setJurisprudenceCronEnabled } = await import(
        "@/server/jurisprudence/actions"
      );
      await setJurisprudenceCronEnabled(enabled);
      toast.success(enabled ? "Cron activado" : "Cron desactivado");
      await loadAll();
    } catch (err) {
      toast.error("Error", {
        description: err instanceof Error ? err.message : "",
      });
    }
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.endsWith(".json")) {
      toast.error("Solo se admiten archivos .json");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!Array.isArray(parsed)) {
          toast.error("El JSON debe ser un array");
          return;
        }
        setPreview(parsed);
      } catch {
        toast.error("El archivo no es un JSON valido");
      }
    };
    reader.readAsText(file);
  }

  function handleImport() {
    if (!preview || preview.length === 0) return;
    startTransition(async () => {
      try {
        const res = await importJurisprudenceBatch(preview as never);
        toast.success(`Se importaron ${res.count} fallos`);
        setPreview(null);
        setFileName("");
        if (fileRef.current) fileRef.current.value = "";
        await loadAll();
        router.refresh();
      } catch (err) {
        toast.error("Error al importar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  function handleExport() {
    startTransition(async () => {
      try {
        const items = await exportJurisprudence();
        const blob = new Blob([JSON.stringify(items, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `jurisprudencia-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Se exportaron ${items.length} fallos`);
      } catch (err) {
        toast.error("Error al exportar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  function handleReset() {
    setPreview(null);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-xl flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-500" />
            Jurisprudencia — Centro de control
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Panel exclusivo del super administrador. Configura fuentes, ejecuta ingesta y monitorea la biblioteca global.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadAll}
          disabled={loading}
          className="gap-1.5"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Actualizar
        </Button>
      </header>

      {/* Metricas */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Cargando metricas...
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              <Database className="h-3 w-3" />
              Fallos en biblioteca
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {stats.totalFallos.toLocaleString("es-AR")}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              <Activity className="h-3 w-3" />
              Fuentes activas
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {stats.totalFuentes}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              <Bot className="h-3 w-3" />
              Agentes activos
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {stats.totalAgentes}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              <Clock className="h-3 w-3" />
              Ultima corrida
            </div>
            <div className="mt-2 text-xs font-medium">
              {stats.lastRunAt
                ? new Date(stats.lastRunAt).toLocaleString("es-AR")
                : "Nunca"}
            </div>
            {stats.lastRunNew > 0 && (
              <div className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                +{stats.lastRunNew} nuevos
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Control */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Settings className="h-4 w-4 text-primary" />
          Control de ingesta
        </h2>

        {stats && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleTriggerIngest}
              disabled={runningIngest}
              className="gap-1.5"
            >
              {runningIngest ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {runningIngest ? "Ejecutando..." : "Ejecutar ingesta ahora"}
            </Button>

            <Button
              variant={stats.cronEnabled ? "outline" : "default"}
              onClick={() => handleToggleCron(!stats.cronEnabled)}
              className="gap-1.5"
            >
              {stats.cronEnabled ? (
                <>
                  <Pause className="h-4 w-4" />
                  Pausar cron
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Activar cron
                </>
              )}
            </Button>

            <div className="flex items-center gap-2">
              {stats.cronEnabled ? (
                <>
                  <CircleDot className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs text-muted-foreground">
                    Cron automatico activo (04:00 hs diario)
                  </span>
                </>
              ) : (
                <>
                  <CircleOff className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Cron automatico pausado
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Agentes */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Bot className="h-4 w-4 text-violet-500" />
          Agentes configurados
        </h2>
        <div className="space-y-2">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{agent.id}</span>
                  {agent.enabled ? (
                    <Badge variant="green" className="text-[10px]">
                      Activo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      Pausado
                    </Badge>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {agent.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {agent.maxPages} paginas x {agent.pageSize} ={" "}
                  {agent.maxPages * agent.pageSize} por corrida
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Logs */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4 text-primary" />
          Ultimas ejecuciones
        </h2>
        {logs.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Sin ejecuciones registradas.
          </p>
        ) : (
          <div className="space-y-1.5">
            {logs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-md border border-border/50 bg-muted/10 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">
                    {new Date(log.startedAt).toLocaleString("es-AR")}
                  </span>
                  <span className="font-mono text-[10px]">{log.query}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    +{log.totalNew}
                  </span>
                  <span className="text-muted-foreground">
                    {log.totalFound} total
                  </span>
                  {log.status === "ok" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Import/Export */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <FileJson className="h-4 w-4 text-primary" />
          Importar / Exportar JSON
        </h2>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs text-muted-foreground">
              Importa fallos desde un archivo JSON (array de objetos).
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                Seleccionar JSON
              </Button>
              {fileName && (
                <span className="text-xs text-muted-foreground">{fileName}</span>
              )}
            </div>

            {preview && preview.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {preview.length} fallos detectados
                </div>
                <Button size="sm" onClick={handleImport} disabled={isPending}>
                  {isPending && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Confirmar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-2 text-xs text-muted-foreground">
              Exporta toda la base de jurisprudencia como JSON.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              disabled={isPending}
              className="gap-1.5"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Exportar JSON
            </Button>
          </div>
        </div>
      </section>
      {/* Config de agentes */}
      <AgentsConfig agents={agents} onSaved={loadAll} />
    </div>
  );
}