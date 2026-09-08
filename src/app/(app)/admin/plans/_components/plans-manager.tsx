"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle2,
  Package,
  Save,
  DollarSign,
  Users as UsersIcon,
  Building2,
  HardDrive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MODULES, ModuleKey, PLAN_MODULES } from "@/lib/modules";
import { PLANS, PLAN_KEYS } from "@/lib/plans";

type PlanConfig = {
  price: number;
  maxUsers: number;
  maxBranch: number;
  storageGB: number;
  modules: ModuleKey[];
};

export function PlansManager() {
  const [plans, setPlans] = useState<Record<string, PlanConfig>>(() => {
    const initial: Record<string, PlanConfig> = {};
    PLAN_KEYS.forEach((key) => {
      initial[key] = {
        price: PLANS[key].price,
        maxUsers: PLANS[key].maxUsers,
        maxBranch: PLANS[key].maxBranch,
        storageGB: PLANS[key].storageGB,
        modules: PLAN_MODULES[key] ?? [],
      };
    });
    return initial;
  });
  const [isPending, startTransition] = useTransition();

  function updatePlanField(planKey: string, field: keyof PlanConfig, value: any) {
    setPlans((prev) => ({
      ...prev,
      [planKey]: { ...prev[planKey], [field]: value },
    }));
  }

  function toggleModule(planKey: string, module: ModuleKey) {
    setPlans((prev) => {
      const current = prev[planKey].modules;
      const next = current.includes(module)
        ? current.filter((m) => m !== module)
        : [...current, module];
      return { ...prev, [planKey]: { ...prev[planKey], modules: next } };
    });
  }

  function save() {
    startTransition(async () => {
      try {
        const { savePlansConfigAction } = await import("@/server/tenant/plan-modules-actions");
        await savePlansConfigAction({ plans });
        toast.success("Planes actualizados");
      } catch (err) {
        toast.error("Error al guardar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Configuración de planes
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Definí precios, límites y módulos de cada plan
          </p>
        </div>
        <Button onClick={save} disabled={isPending} className="gap-1.5">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar configuración
        </Button>
      </header>

      <div className="space-y-6">
        {PLAN_KEYS.map((planKey) => {
          const plan = plans[planKey];
          const isPopular = planKey === "professional";
          return (
            <div
              key={planKey}
              className={cn(
                "rounded-xl border p-6",
                isPopular
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-card"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    {PLANS[planKey].label}
                    {isPopular && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
                        POPULAR
                      </span>
                    )}
                  </h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {PLANS[planKey].description ?? "Plan de suscripción"}
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                  {plan.modules.length} módulos
                </span>
              </div>

              {/* Precio y límites */}
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                <div>
                  <Label className="text-[11px]">Precio mensual ($)</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="number"
                      value={plan.price}
                      onChange={(e) => updatePlanField(planKey, "price", Number(e.target.value))}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[11px]">Máximo de usuarios</Label>
                  <div className="relative mt-1">
                    <UsersIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="number"
                      value={plan.maxUsers}
                      onChange={(e) => updatePlanField(planKey, "maxUsers", Number(e.target.value))}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[11px]">Máximo de sucursales</Label>
                  <div className="relative mt-1">
                    <Building2 className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="number"
                      value={plan.maxBranch}
                      onChange={(e) => updatePlanField(planKey, "maxBranch", Number(e.target.value))}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[11px]">Almacenamiento (GB)</Label>
                  <div className="relative mt-1">
                    <HardDrive className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="number"
                      value={plan.storageGB}
                      onChange={(e) => updatePlanField(planKey, "storageGB", Number(e.target.value))}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>

              {/* Módulos */}
              <div className="mt-4">
                <Label className="text-[11px]">Módulos incluidos</Label>
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {(Object.keys(MODULES) as ModuleKey[]).map((moduleKey) => {
                    const module = MODULES[moduleKey];
                    const isActive = plan.modules.includes(moduleKey);
                    return (
                      <button
                        key={moduleKey}
                        type="button"
                        onClick={() => toggleModule(planKey, moduleKey)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border p-3 text-left transition-all",
                          isActive
                            ? "border-primary/40 bg-primary/5"
                            : "border-border bg-background opacity-60"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-full border",
                            isActive
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/30"
                          )}
                        >
                          {isActive && <CheckCircle2 className="h-3 w-3" />}
                        </span>
                        <div>
                          <div className="text-xs font-medium">{module.label}</div>
                          <div className="text-[9px] text-muted-foreground">
                            {module.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}