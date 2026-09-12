"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  Boxes,
  Search,
  Building2,
  Crown,
  Lock,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  listModulesAction,
  updateModuleAction,
  listFirmsWithModulesAction,
  setFirmBaseModulesAction,
  setFirmPremiumModuleAction,
  type ModuleConfigRow,
  type FirmWithModules,
} from "@/server/admin/modules-actions";

export function ModulesManager() {
  const [modules, setModules] = useState<ModuleConfigRow[]>([]);
  const [firms, setFirms] = useState<FirmWithModules[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null);

  // Carga inicial
  useEffect(() => {
    (async () => {
      try {
        const [mods, fs] = await Promise.all([
          listModulesAction(),
          listFirmsWithModulesAction(),
        ]);
        setModules(mods);
        setFirms(fs);
      } catch (e) {
        toast.error("Error al cargar datos", {
          description: e instanceof Error ? e.message : "",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Búsqueda de estudios
  function handleSearch(q: string) {
    setQuery(q);
    startTransition(async () => {
      try {
        const fs = await listFirmsWithModulesAction(q);
        setFirms(fs);
      } catch (e) {
        toast.error("Error al buscar", {
          description: e instanceof Error ? e.message : "",
        });
      }
    });
  }

  // Editar un módulo del catálogo
  function handleUpdateModule(mod: ModuleConfigRow) {
    startTransition(async () => {
      try {
        await updateModuleAction({
          key: mod.key,
          label: mod.label,
          description: mod.description,
          price: mod.price,
          premium: mod.premium,
          enabled: mod.enabled,
          sortOrder: mod.sortOrder,
        });
        toast.success(`Módulo "${mod.label}" actualizado`);
      } catch (e) {
        toast.error("Error al guardar", {
          description: e instanceof Error ? e.message : "",
        });
      }
    });
  }

  // Cambiar un campo del módulo local (sin guardar)
  function updateLocalModuleField<K extends keyof ModuleConfigRow>(
    key: string,
    field: K,
    value: ModuleConfigRow[K]
  ) {
    setModules((prev) =>
      prev.map((m) => (m.key === key ? { ...m, [field]: value } : m))
    );
  }

  // Base: activar/desactivar módulo base por estudio
  function handleToggleBase(firm: FirmWithModules, moduleKey: string) {
    const next = firm.enabledBaseModules.includes(moduleKey)
      ? firm.enabledBaseModules.filter((k) => k !== moduleKey)
      : [...firm.enabledBaseModules, moduleKey];

    startTransition(async () => {
      try {
        await setFirmBaseModulesAction({ firmId: firm.id, enabled: next });
        setFirms((prev) =>
          prev.map((f) =>
            f.id === firm.id ? { ...f, enabledBaseModules: next } : f
          )
        );
        toast.success(`Módulo ${moduleKey} actualizado para ${firm.name}`);
      } catch (e) {
        toast.error("Error al actualizar", {
          description: e instanceof Error ? e.message : "",
        });
      }
    });
  }

  // Premium: activar/desactivar módulo premium por estudio
  function handleTogglePremium(firm: FirmWithModules, moduleKey: string) {
    const sub = firm.premiumSubscriptions.find((s) => s.moduleKey === moduleKey);
    const nextActive = !(sub?.active ?? false);

    startTransition(async () => {
      try {
        await setFirmPremiumModuleAction({
          firmId: firm.id,
          moduleKey,
          active: nextActive,
        });
        setFirms((prev) =>
          prev.map((f) =>
            f.id === firm.id
              ? {
                  ...f,
                  premiumSubscriptions: f.premiumSubscriptions.some(
                    (s) => s.moduleKey === moduleKey
                  )
                    ? f.premiumSubscriptions.map((s) =>
                        s.moduleKey === moduleKey
                          ? { ...s, active: nextActive, status: nextActive ? "active" : "suspended" }
                          : s
                      )
                    : [
                        ...f.premiumSubscriptions,
                        {
                          moduleKey,
                          active: nextActive,
                          autoRenew: false,
                          status: nextActive ? "active" : "suspended",
                          currentPeriodEnd: null,
                        },
                      ],
                }
              : f
          )
        );
        toast.success(`Módulo premium actualizado para ${firm.name}`);
      } catch (e) {
        toast.error("Error al actualizar", {
          description: e instanceof Error ? e.message : "",
        });
      }
    });
  }

  const baseModules = modules.filter((m) => !m.premium);
  const premiumModules = modules.filter((m) => m.premium);
  const selectedFirm = firms.find((f) => f.id === selectedFirmId) ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-xl flex items-center gap-2">
          <Boxes className="h-5 w-5 text-primary" />
          Módulos
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Catálogo de módulos y asignación por estudio
        </p>
      </header>

      {/* Catálogo */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-medium mb-4">Catálogo de módulos</h2>
        <div className="space-y-3">
          {modules.map((mod) => (
            <div
              key={mod.key}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background p-3"
            >
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{mod.label}</span>
                  {mod.premium && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Crown className="h-3 w-3" />
                      Premium
                    </Badge>
                  )}
                  {!mod.enabled && (
                    <Badge variant="destructive" className="text-[10px]">
                      Deshabilitado
                    </Badge>
                  )}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                  {mod.key}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <Label className="text-[10px]">Precio mensual ($)</Label>
                  <Input
                    type="number"
                    value={mod.price}
                    onChange={(e) =>
                      updateLocalModuleField(mod.key, "price", Number(e.target.value))
                    }
                    className="h-8 w-28 text-xs"
                  />
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    updateLocalModuleField(mod.key, "premium", !mod.premium)
                  }
                  className="gap-1.5"
                >
                  {mod.premium ? <Crown className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {mod.premium ? "Premium" : "Base"}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    updateLocalModuleField(mod.key, "enabled", !mod.enabled)
                  }
                  className="gap-1.5"
                >
                  {mod.enabled ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {mod.enabled ? "Activo" : "Inactivo"}
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleUpdateModule(mod)}
                  disabled={isPending}
                  className="gap-1.5"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Guardar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Estudios */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-medium mb-4">Estudios</h2>

        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o slug..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {firms.length === 0 && (
          <p className="text-xs text-muted-foreground">No hay estudios que coincidan.</p>
        )}

        <div className="space-y-2">
          {firms.map((firm) => (
            <button
              key={firm.id}
              onClick={() =>
                setSelectedFirmId(firm.id === selectedFirmId ? null : firm.id)
              }
              className={cn(
                "w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                firm.id === selectedFirmId
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-background hover:bg-muted/30"
              )}
            >
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{firm.name}</div>
                <div className="font-mono text-[10px] text-muted-foreground truncate">
                  {firm.slug} · plan {firm.plan}
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {firm.enabledBaseModules.length} base ·{" "}
                {firm.premiumSubscriptions.filter((s) => s.active).length} premium
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detalle del estudio seleccionado */}
      {selectedFirm && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-medium">
                {selectedFirm.name}
              </h2>
              <div className="font-mono text-[10px] text-muted-foreground">
                {selectedFirm.slug}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFirmId(null)}
            >
              Cerrar
            </Button>
          </div>

          {/* Módulos base */}
          <div className="mb-6">
            <h3 className="text-xs font-medium text-muted-foreground mb-2">
              Módulos base (sin cobro)
            </h3>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
              {baseModules.map((mod) => {
                const active = selectedFirm.enabledBaseModules.includes(mod.key);
                return (
                  <button
                    key={mod.key}
                    onClick={() => handleToggleBase(selectedFirm, mod.key)}
                    disabled={isPending}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border p-3 text-left transition-colors",
                      active
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-border bg-background opacity-60"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-full border text-[10px]",
                        active
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {active && "✓"}
                    </span>
                    <span className="text-xs">{mod.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Módulos premium */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2">
              Módulos premium (contratables)
            </h3>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
              {premiumModules.map((mod) => {
                const sub = selectedFirm.premiumSubscriptions.find(
                  (s) => s.moduleKey === mod.key
                );
                const active = sub?.active ?? false;
                return (
                  <button
                    key={mod.key}
                    onClick={() => handleTogglePremium(selectedFirm, mod.key)}
                    disabled={isPending}
                    className={cn(
                      "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
                      active
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-background opacity-60"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{mod.label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        ${mod.price.toLocaleString("es-AR")}/mes
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {active ? `Activo · ${sub?.status}` : "No contratado"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}