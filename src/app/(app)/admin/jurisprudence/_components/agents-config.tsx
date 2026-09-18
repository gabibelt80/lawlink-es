"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";

type AgentCfg = {
  id: string;
  keywords: string[];
  maxPages: number;
  pageSize: number;
  enabled: boolean;
};

export function AgentsConfig({
  agents,
  onSaved,
}: {
  agents: AgentCfg[];
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<AgentCfg[]>(agents);
  const [saving, setSaving] = useState(false);

  function updateAgent(id: string, patch: Partial<AgentCfg>) {
    setDraft((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a))
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { setJurisprudenceAgentConfig } = await import(
        "@/server/jurisprudence/actions"
      );
      await setJurisprudenceAgentConfig(draft);
      toast.success("Configuracion guardada");
      onSaved();
    } catch (err) {
      toast.error("Error", {
        description: err instanceof Error ? err.message : "",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Agentes de ingesta</h2>
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Guardar
        </Button>
      </div>

      {draft.map((agent) => (
        <div key={agent.id} className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium">{agent.id}</div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={agent.enabled}
                onChange={(e) => updateAgent(agent.id, { enabled: e.target.checked })}
              />
              Activo
            </label>
          </div>

          <div className="mt-2 space-y-2">
            <div>
              <label className="text-[10px] text-muted-foreground">Keywords (una por linea)</label>
              <textarea
                value={agent.keywords.join("\n")}
                onChange={(e) =>
                  updateAgent(agent.id, {
                    keywords: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                  })
                }
                rows={4}
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Max pages</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={agent.maxPages}
                  onChange={(e) => updateAgent(agent.id, { maxPages: Number(e.target.value) })}
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Page size</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={agent.pageSize}
                  onChange={(e) => updateAgent(agent.id, { pageSize: Number(e.target.value) })}
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}