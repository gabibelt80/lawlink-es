"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Package,
  Users,
  Building2,
  HardDrive,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS, PlanKey, PlanInfo } from "@/lib/plans";
import { formatARS } from "@/lib/currency";
import { canChangePlan } from "@/lib/plan-hierarchy";

type FirmSubscription = {
  id: string;
  name: string;
  plan: string;
  planLabel: string;
  planPrice: number;
  subscriptionStatus: string;
  subscriptionPeriodEnd: Date | null;
  lastPaymentAt: Date | null;
  lastPaymentAmount: number | null;
  maxUsers: number;
  maxBranch: number;
};

type SubscriptionViewProps = {
  firm: FirmSubscription;
  plans: Record<PlanKey, PlanInfo>;
  currentModules: string[];
};

const STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  past_due: "Pago pendiente",
  canceled: "Cancelada",
  suspended: "Suspendida",
  trial: "Período de prueba",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-700",
  past_due: "bg-amber-500/15 text-amber-700",
  canceled: "bg-destructive/15 text-destructive",
  suspended: "bg-destructive/15 text-destructive",
  trial: "bg-blue-500/15 text-blue-700",
};

export function SubscriptionView({ firm, plans, currentModules }: SubscriptionViewProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedPlan, setSelectedPlan] = useState<string>(firm.plan);

  const statusLabel = STATUS_LABELS[firm.subscriptionStatus] ?? firm.subscriptionStatus;
  const statusColor = STATUS_COLORS[firm.subscriptionStatus] ?? "bg-muted";

  function handlePlanChange(planKey: string) {
    startTransition(async () => {
      try {
        const { changePlanAction } = await import("@/server/billing/subscription-actions");
        const result = await changePlanAction({ planKey });
        
        if (result.requiresPayment && result.checkoutUrl) {
          // Redirigir al checkout de Mercado Pago
          toast.info('Redirigiendo al pago...');
          window.location.href = result.checkoutUrl;
        } else {
          toast.success('Plan actualizado correctamente');
          window.location.reload();
        }
      } catch (err) {
        toast.error('Error al cambiar plan', {
          description: err instanceof Error ? err.message : '',
        });
      }
    });
  }

  function handlePayNow() {
    startTransition(async () => {
      try {
        const { createCheckoutAction } = await import("@/server/billing/subscription-actions");
        const result = await createCheckoutAction();
        if (result?.checkoutUrl) {
          window.location.href = result.checkoutUrl;
        } else {
          toast.success("Solicitud de pago creada");
        }
      } catch (err) {
        toast.error("Error al procesar pago", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-xl flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Suscripción y facturación
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Gestioná tu plan, pagos y facturación
        </p>
      </header>

      {/* Estado actual */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Plan actual: {firm.planLabel}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Estudio: {firm.name}
            </p>
          </div>
          <Badge variant="outline" className={cn("text-[11px]", statusColor)}>
            {statusLabel}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="text-[10px] text-muted-foreground">Precio mensual</div>
            <div className="mt-1 text-lg font-semibold">
              {formatARS(firm.planPrice)}
            </div>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="text-[10px] text-muted-foreground">Usuarios incluidos</div>
            <div className="mt-1 text-lg font-semibold">{firm.maxUsers}</div>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="text-[10px] text-muted-foreground">Sucursales</div>
            <div className="mt-1 text-lg font-semibold">{firm.maxBranch}</div>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="text-[10px] text-muted-foreground">Módulos activos</div>
            <div className="mt-1 text-lg font-semibold">{currentModules.length}</div>
          </div>
        </div>

        {firm.subscriptionPeriodEnd && (
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Próxima renovación: {new Date(firm.subscriptionPeriodEnd).toLocaleDateString("es-AR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        )}

        {firm.lastPaymentAt && (
          <div className="mt-2 text-xs text-muted-foreground">
            Último pago: {new Date(firm.lastPaymentAt).toLocaleDateString("es-AR")}
            {firm.lastPaymentAmount ? ` - {formatARS(firm.lastPaymentAmount)}` : ""}
          </div>
        )}

        {firm.subscriptionStatus === "past_due" && (
          <Button
            onClick={handlePayNow}
            disabled={isPending}
            className="mt-4 gap-1.5"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            Pagar ahora
          </Button>
        )}
      </div>

      {/* Cambio de plan */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-medium mb-4">Cambiar de plan</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(plans) as PlanKey[]).map((planKey) => {
            const plan = plans[planKey];
            const isCurrent = planKey === firm.plan;
            const isPopular = planKey === "professional";
            const isUpgrade = canChangePlan(firm.plan, planKey);

            return (
              <div
                key={planKey}
                className={cn(
                  "rounded-xl border p-4",
                  isCurrent
                    ? "border-primary/40 bg-primary/5"
                    : isPopular
                      ? "border-primary/30 bg-primary/3"
                      : "border-border bg-card"
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{plan.label}</h3>
                  {isPopular && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] text-primary">
                      POPULAR
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">{plan.description}</p>

                <div className="mt-3">
                  <span className="text-xl font-bold">
                    {formatARS(plan.price)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">/mes</span>
                </div>

                <ul className="mt-3 space-y-1">
                  {plan.features.slice(0, 4).map((feature, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 mt-0.5 text-emerald-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button disabled variant="outline" className="mt-4 w-full text-xs">
                    Plan actual
                  </Button>
                ) : !isUpgrade ? (
                  <Button disabled variant="ghost" className="mt-4 w-full text-xs opacity-50">
                    No disponible
                  </Button>
                ) : plan.price === 0 ? (
                  <Button
                    variant="outline"
                    className="mt-4 w-full text-xs"
                    onClick={() => handlePlanChange(planKey)}
                    disabled={isPending}
                  >
                    Cambiar a {plan.label}
                  </Button>
                ) : (
                  <Button
                    className="mt-4 w-full text-xs gap-1.5"
                    onClick={() => handlePlanChange(planKey)}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Cambiar a {plan.label}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
