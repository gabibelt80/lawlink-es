"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  FileText,
  Scale,
  ShieldCheck,
  Activity,
  CircleDot,
  CircleOff,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AgentStatus = {
  name: string;
  icon: "editor" | "auditor";
  enabled: boolean;
  tokensUsed: number;
  tokensLimit: number;
  status: "idle" | "working" | "done" | "error";
  lastAction: string;
  lastActionAt: Date | null;
};

export function AgentsPanel() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
    const interval = setInterval(loadAgents, 5000);
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
    }
  }

  if (!session?.user) return null;

  return (
    <div className="border-t border-border px-2 py-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        Agentes IA
        <span className="ml-auto flex items-center gap-1">
          {agents.some(a => a.status === "working") && (
            <Activity className="h-3 w-3 animate-pulse text-emerald-500" />
          )}
        </span>
      </button>

      {expanded && (
        <div className="mt-1 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            </div>
          ) : agents.length === 0 ? (
            <p className="px-2 py-1 text-[10px] text-muted-foreground">
              No hay agentes configurados
            </p>
          ) : (
            agents.map((agent) => (
              <div
                key={agent.name}
                className={cn(
                  "rounded-md border border-border bg-card px-2 py-1.5",
                  agent.status === "working" && "border-emerald-500/40 bg-emerald-500/5"
                )}
              >
                <div className="flex items-center gap-1.5">
                  {agent.icon === "editor" ? (
                    <FileText className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Scale className="h-3.5 w-3.5 text-primary" />
                  )}
                  <span className="text-[11px] font-medium flex-1 truncate">
                    {agent.name}
                  </span>
                  {agent.enabled ? (
                    <CircleDot className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <CircleOff className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>

                {/* Tokens */}
                <div className="mt-1.5">
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                    <span>Tokens: {agent.tokensUsed.toLocaleString()} / {agent.tokensLimit.toLocaleString()}</span>
                    <span>{Math.round((agent.tokensUsed / agent.tokensLimit) * 100)}%</span>
                  </div>
                  <div className="mt-0.5 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        agent.tokensUsed / agent.tokensLimit > 0.8
                          ? "bg-destructive"
                          : agent.tokensUsed / agent.tokensLimit > 0.5
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      )}
                      style={{ width: `${Math.min((agent.tokensUsed / agent.tokensLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Última acción */}
                {agent.lastAction && (
                  <p className="mt-1 truncate text-[9px] text-muted-foreground">
                    {agent.lastAction}
                  </p>
                )}

                {/* Botón intervenir */}
                {agent.enabled && agent.status !== "working" && (
                  <button
                    type="button"
                    onClick={() => {
                      // Abrir el chat del editor
                      const event = new CustomEvent("open-agent-chat", {
                        detail: { agent: agent.icon },
                      });
                      window.dispatchEvent(event);
                    }}
                    className="mt-1.5 flex w-full items-center justify-center gap-1 rounded border border-border bg-background px-2 py-1 text-[10px] text-foreground hover:bg-popover hover:text-primary"
                  >
                    <Activity className="h-3 w-3" />
                    Intervenir
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}