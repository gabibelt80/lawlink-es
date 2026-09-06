"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Scale,
  Activity,
  CircleDot,
  CircleOff,
  Loader2,
  RefreshCw,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  TrendingUp,
  Cpu,
  Terminal,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type AgentInfo = {
  name: string;
  icon: "editor" | "auditor";
  enabled: boolean;
  tokensUsed: number;
  tokensLimit: number;
  status: "idle" | "working" | "done" | "error";
  lastAction: string;
  lastActionAt: Date | null;
  successRate: number;
  avgResponseTime: number;
};

const GRADIENTS = {
  editor: "from-blue-500/20 via-primary/10 to-transparent",
  auditor: "from-violet-500/20 via-purple-500/10 to-transparent",
};

const ICON_COLORS = {
  editor: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  auditor: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

export function AgentsDashboard() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [matterId, setMatterId] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    loadAgents();
    const interval = setInterval(loadAgents, 3000);
    return () => clearInterval(interval);
  }, []);

  async function loadAgents() {
    try {
      const { getAgentsStatus } = await import("@/server/settings/ai-agents-actions");
      const status = await getAgentsStatus();
      setAgents(status);
    } catch {
      // Silencioso
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleRefresh() {
    setRefreshing(true);
    loadAgents();
  }

  function handleIntervene(agent: AgentInfo) {
    setSelectedAgent(agent);
    setAnswer("");
    setQuestion("");
    setMatterId("");
  }

  async function handleAsk() {
    if (!matterId.trim() || !question.trim()) {
      toast.warning("Ingresá el caso y tu consulta");
      return;
    }
    setAsking(true);
    setAnswer("");
    try {
      const { askAgentAboutCase } = await import("@/server/settings/ai-agents-actions");
      const result = await askAgentAboutCase({
        agentType: selectedAgent!.icon,
        matterId: matterId.trim(),
        question: question.trim(),
      });
      setAnswer(result.response);
    } catch (err) {
      toast.error("Error al consultar", {
        description: err instanceof Error ? err.message : "",
      });
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-violet-500 text-primary-foreground shadow-lg shadow-primary/25">
              <Activity className="h-5 w-5" />
            </div>
            <span className="font-semibold bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              Agentes IA
            </span>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Monitoreo en tiempo real · Tokens · Estado · Intervención
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="gap-1.5">
          {refreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Actualizar
        </Button>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Cargando agentes...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {agents.map((agent) => (
            <div
              key={agent.name}
              className={cn(
                "relative overflow-hidden rounded-2xl border border-border bg-card p-6",
                "shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-300"
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-50",
                  GRADIENTS[agent.icon]
                )}
              />

              <div className="relative">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl",
                        ICON_COLORS[agent.icon]
                      )}
                    >
                      {agent.icon === "editor" ? (
                        <FileText className="h-6 w-6" />
                      ) : (
                        <Scale className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">{agent.name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                            agent.status === "working"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : agent.status === "error"
                                ? "bg-red-500/15 text-red-600 dark:text-red-400"
                                : "bg-muted text-muted-foreground"
                          )}
                        >
                          {agent.status === "working" ? (
                            <>
                              <Activity className="h-3 w-3 animate-pulse" />
                              Trabajando
                            </>
                          ) : agent.status === "error" ? (
                            <>
                              <XCircle className="h-3 w-3" />
                              Error
                            </>
                          ) : (
                            <>
                              <CircleDot className="h-3 w-3" />
                              En espera
                            </>
                          )}
                        </span>
                        {agent.enabled ? (
                          <CircleDot className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <CircleOff className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                  {agent.status === "working" && (
                    <Sparkles className="h-5 w-5 animate-pulse text-emerald-500" />
                  )}
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-background/50 p-3 backdrop-blur">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Cpu className="h-3 w-3" />
                      Tokens
                    </div>
                    <div className="mt-1 font-mono text-base font-semibold">
                      {agent.tokensUsed.toLocaleString()}
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      de {agent.tokensLimit.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-xl bg-background/50 p-3 backdrop-blur">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      Éxito
                    </div>
                    <div className="mt-1 font-mono text-base font-semibold">
                      {agent.successRate}%
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      tasa de aciertos
                    </div>
                  </div>
                  <div className="rounded-xl bg-background/50 p-3 backdrop-blur">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Terminal className="h-3 w-3" />
                      Respuesta
                    </div>
                    <div className="mt-1 font-mono text-base font-semibold">
                      {agent.avgResponseTime}s
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      promedio
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Uso de tokens</span>
                    <span className="font-mono">
                      {Math.round((agent.tokensUsed / agent.tokensLimit) * 100)}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        agent.tokensUsed / agent.tokensLimit > 0.8
                          ? "bg-gradient-to-r from-red-500 to-red-400"
                          : agent.tokensUsed / agent.tokensLimit > 0.5
                            ? "bg-gradient-to-r from-amber-500 to-amber-400"
                            : "bg-gradient-to-r from-emerald-500 to-emerald-400"
                      )}
                      style={{ width: `${Math.min((agent.tokensUsed / agent.tokensLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {agent.lastAction}
                </div>

                <Button
                  onClick={() => handleIntervene(agent)}
                  disabled={!agent.enabled || agent.status === "working"}
                  className={cn(
                    "mt-5 w-full gap-1.5",
                    "bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90",
                    "text-primary-foreground shadow-lg shadow-primary/25"
                  )}
                >
                  <Zap className="h-4 w-4" />
                  Intervenir ahora
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Diálogo de consulta */}
      <Dialog open={!!selectedAgent} onOpenChange={(o) => !o && setSelectedAgent(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAgent?.icon === "editor" ? (
                <FileText className="h-5 w-5 text-blue-500" />
              ) : (
                <Scale className="h-5 w-5 text-violet-500" />
              )}
              Consultar a {selectedAgent?.name}
            </DialogTitle>
            <DialogDescription>
              Ingresá el código del caso y tu consulta. El agente analizará el caso completo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Código del caso</Label>
              <Input
                value={matterId}
                onChange={(e) => setMatterId(e.target.value)}
                placeholder="Ej: JD-2026-AD-0001"
                className="mt-1 font-mono text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">Tu consulta</Label>
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={`Ej: ¿Qué documentos faltan en este caso? ¿Hay errores en los escritos? ¿Qué acciones recomendarías?`}
                rows={4}
                className="mt-1"
              />
            </div>

            <Button
              onClick={handleAsk}
              disabled={asking || !matterId.trim() || !question.trim()}
              className="w-full gap-1.5"
            >
              {asking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Consultar agente
            </Button>

            {answer && (
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <h4 className="mb-2 text-xs font-semibold text-foreground">
                  Respuesta del agente:
                </h4>
                <pre className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/85">
                  {answer}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}