"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Building2,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Users,
  Calendar,
  Package,
  PauseCircle,
  AlertTriangle,
  Undo2,
  Activity,
  CreditCard,
  DollarSign,
  TrendingUp,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PLANS, getPlan } from "@/lib/plans";
import { formatARS } from "@/lib/currency";
import { getPlanModules, MODULES } from "@/lib/modules";
import {
  createFirmAction,
  toggleFirmActiveAction,
  updateFirmPlanAction,
  suspendFirmAction,
  scheduleFirmDeletionAction,
  cancelFirmDeletionAction,
  hardDeleteFirmAction,
} from "@/server/tenant/admin-actions";

type FirmRow = {
  id: string;
  name: string;
  slug: string;
  email: string;
  active: boolean;
  plan: string;
  planExpiresAt: Date | null;
  maxUsers: number;
  maxBranch: number;
  createdAt: Date;
  suspendedAt: Date | null;
  suspensionReason: string | null;
  deletedAtScheduled: Date | null;
  subscriptionStatus: string;
  subscriptionPeriodStart: Date | null;
  subscriptionPeriodEnd: Date | null;
  lastPaymentAt: Date | null;
  lastPaymentAmount: { toString(): string } | null;
  paymentProvider: string;
  _count: { users: number };
};

type SubscriptionStats = {
  active: number;
  pastDue: number;
  canceled: number;
  suspended: number;
};

type DialogState =
  | { type: "create" }
  | { type: "suspend"; firmId: string; firmName: string }
  | { type: "scheduleDelete"; firmId: string; firmName: string }
  | { type: "hardDelete"; firmId: string; firmName: string }
  | null;

export function AdminView({
  firms,
  customModules,
  subscriptionStats,
}: {
  firms: FirmRow[];
  customModules: Record<string, string[]>;
  subscriptionStats?: SubscriptionStats;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [isPending, startTransition] = useTransition();
  const [suspendReason, setSuspendReason] = useState("");

  const stats = subscriptionStats ?? {
    active: firms.filter((f) => f.active && f.subscriptionStatus === "active").length,
    pastDue: firms.filter((f) => f.subscriptionStatus === "past_due").length,
    canceled: firms.filter((f) => f.subscriptionStatus === "canceled").length,
    suspended: firms.filter((f) => f.suspendedAt || f.subscriptionStatus === "suspended").length,
  };

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createFirmAction({
          firmName: formData.get("firmName") as string,
          firmEmail: formData.get("firmEmail") as string,
          userName: formData.get("userName") as string,
          userEmail: formData.get("userEmail") as string,
          password: formData.get("password") as string,
        });
        toast.success("Estudio creado correctamente");
        setDialog(null);
        router.refresh();
      } catch (err) {
        toast.error("Error al crear estudio", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  function handleToggle(firmId: string) {
    startTransition(async () => {
      try {
        await toggleFirmActiveAction({ firmId });
        toast.success("Estado actualizado");
        router.refresh();
      } catch (err) {
        toast.error("Error al actualizar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  function handleSuspendConfirm() {
    if (dialog?.type !== "suspend") return;
    startTransition(async () => {
      try {
        await suspendFirmAction({ firmId: dialog.firmId, reason: suspendReason || undefined });
        toast.success("Estudio suspendido");
        setDialog(null);
        setSuspendReason("");
        router.refresh();
      } catch (err) {
        toast.error("Error al suspender", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  function handleScheduleDeleteConfirm() {
    if (dialog?.type !== "scheduleDelete") return;
    startTransition(async () => {
      try {
        await scheduleFirmDeletionAction({ firmId: dialog.firmId });
        toast.success("Eliminación programada (30 días)");
        setDialog(null);
        router.refresh();
      } catch (err) {
        toast.error("Error al programar eliminación", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  function handleCancelDelete(firmId: string) {
    startTransition(async () => {
      try {
        await cancelFirmDeletionAction({ firmId });
        toast.success("Eliminación cancelada");
        router.refresh();
      } catch (err) {
        toast.error("Error al cancelar eliminación", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  function handleHardDeleteConfirm() {
    if (dialog?.type !== "hardDelete") return;
    startTransition(async () => {
      try {
        await hardDeleteFirmAction({ firmId: dialog.firmId });
        toast.success("Estudio eliminado permanentemente");
        setDialog(null);
        router.refresh();
      } catch (err) {
        toast.error("Error al eliminar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  function handlePlanChange(firmId: string, plan: string) {
    startTransition(async () => {
      try {
        await updateFirmPlanAction({ firmId, plan });
        toast.success("Plan actualizado");
        router.refresh();
      } catch (err) {
        toast.error("Error al actualizar plan", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Panel de administración
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Gestión central del sistema LawLink
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push("/admin/plans")}
            className="gap-1.5"
          >
            <Package className="h-3.5 w-3.5" />
            Configurar planes
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push("/admin/jurisprudence")}
            className="gap-1.5"
          >
            <Scale className="h-3.5 w-3.5" />
            Jurisprudencia
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push("/admin/analytics")}
            className="gap-1.5"
          >
            <Activity className="h-3.5 w-3.5" />
            Analíticas
          </Button>
          <Button size="sm" onClick={() => setDialog({ type: "create" })} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Nuevo estudio
          </Button>
        </div>
      </header>

      {/* Stats - incluyendo suscripciones */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-[11px] text-muted-foreground">Total estudios</span>
          </div>
          <div className="mt-1 font-mono text-2xl tabular text-foreground">{firms.length}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-500" />
            <span className="text-[11px] text-muted-foreground">Suscripciones activas</span>
          </div>
          <div className="mt-1 font-mono text-2xl tabular text-foreground">{stats.active}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-[11px] text-muted-foreground">Con pagos pendientes</span>
          </div>
          <div className="mt-1 font-mono text-2xl tabular text-foreground">{stats.pastDue}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <PauseCircle className="h-4 w-4 text-destructive" />
            <span className="text-[11px] text-muted-foreground">Suspendidos</span>
          </div>
          <div className="mt-1 font-mono text-2xl tabular text-foreground">{stats.suspended}</div>
        </div>
      </div>

      {/* Firms Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-medium">Estudios jurídicos registrados</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-normal">Estudio</th>
                <th className="px-4 py-2.5 text-left font-normal">Plan</th>
                <th className="px-4 py-2.5 text-left font-normal">Suscripción</th>
                <th className="px-4 py-2.5 text-left font-normal">Módulos</th>
                <th className="px-4 py-2.5 text-left font-normal">Usuarios</th>
                <th className="px-4 py-2.5 text-left font-normal">Último pago</th>
                <th className="px-4 py-2.5 text-left font-normal">Estado</th>
                <th className="px-4 py-2.5 text-right font-normal">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {firms.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No hay estudios registrados todavía.
                  </td>
                </tr>
              )}
              {firms.map((f) => {
                const modules = customModules[f.plan] ?? getPlanModules(f.plan);
                const isScheduled = !!f.deletedAtScheduled;
                const isSuspended = !!f.suspendedAt && !f.deletedAtScheduled;
                const planInfo = getPlan(f.plan);
                return (
                  <tr
                    key={f.id}
                    className={cn(
                      "hover:bg-muted/20 transition-colors",
                      isScheduled && "opacity-50",
                      isSuspended && "bg-amber-500/5",
                      f.subscriptionStatus === "past_due" && "bg-destructive/5"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{f.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {f.slug}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{f.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={f.plan}
                        onValueChange={(v) => handlePlanChange(f.id, v)}
                        disabled={isScheduled}
                      >
                        <SelectTrigger className="h-8 w-36 bg-background text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(PLANS) as Array<keyof typeof PLANS>).map((key) => (
                            <SelectItem key={key} value={key}>
                              {PLANS[key].label}
                              {PLANS[key].price > 0 ? ` · $${(PLANS[key].price / 1000).toFixed(1)}k` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      {f.subscriptionStatus === "active" ? (
                        <Badge variant="green" className="text-[10px]">Activa</Badge>
                      ) : f.subscriptionStatus === "past_due" ? (
                        <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-700">
                          Pago pendiente
                        </Badge>
                      ) : f.subscriptionStatus === "canceled" ? (
                        <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                          Cancelada
                        </Badge>
                      ) : f.subscriptionStatus === "suspended" ? (
                        <Badge variant="destructive" className="text-[10px]">Suspendida</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          {f.subscriptionStatus}
                        </Badge>
                      )}
                      {f.subscriptionPeriodEnd && (
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          Vence: {new Date(f.subscriptionPeriodEnd).toLocaleDateString("es-AR")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        {modules.length}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {f._count.users}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {f.lastPaymentAt ? (
                        <div>
                          <div className="text-xs">
                            {new Date(f.lastPaymentAt).toLocaleDateString("es-AR")}
                          </div>
                          {f.lastPaymentAmount && (
                            <div className="text-[10px] text-muted-foreground">
                              ${formatARS(Number(f.lastPaymentAmount))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin pagos</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isScheduled ? (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Eliminación programada
                        </Badge>
                      ) : isSuspended ? (
                        <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/30 text-amber-700">
                          <PauseCircle className="h-3 w-3" />
                          Suspendido
                        </Badge>
                      ) : f.active ? (
                        <Badge variant="green" className="text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <XCircle className="h-3 w-3" />
                          Inactivo
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {isScheduled ? (
                          <>
                            <button
                              onClick={() => handleCancelDelete(f.id)}
                              className="rounded-md p-1.5 text-emerald-600 hover:bg-popover transition-colors"
                              title="Cancelar eliminación"
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDialog({ type: "hardDelete", firmId: f.id, firmName: f.name })}
                              className="rounded-md p-1.5 text-destructive hover:bg-popover transition-colors"
                              title="Eliminar ahora permanentemente"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            {!isSuspended && f.active && (
                              <>
                                <button
                                  onClick={() => handleToggle(f.id)}
                                  className="rounded-md p-1.5 text-muted-foreground hover:bg-popover hover:text-foreground transition-colors"
                                  title="Desactivar estudio"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => setDialog({ type: "suspend", firmId: f.id, firmName: f.name })}
                                  className="rounded-md p-1.5 text-amber-600 hover:bg-popover transition-colors"
                                  title="Suspender estudio"
                                >
                                  <PauseCircle className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                            {!f.active && !isSuspended && (
                              <button
                                onClick={() => handleToggle(f.id)}
                                className="rounded-md p-1.5 text-emerald-600 hover:bg-popover transition-colors"
                                title="Activar estudio"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => setDialog({ type: "scheduleDelete", firmId: f.id, firmName: f.name })}
                              className="rounded-md p-1.5 text-destructive hover:bg-popover transition-colors"
                              title="Programar eliminación"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialog?.type === "create"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo estudio jurídico</DialogTitle>
            <DialogDescription>
              Se creará el espacio de trabajo con su schema y usuario administrador.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre del estudio</Label>
              <Input name="firmName" required placeholder="Ej.: Estudio Perez & Asociados" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email del estudio</Label>
              <Input name="firmEmail" type="email" required placeholder="contacto@estudio.com" />
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-xs font-medium mb-3">Administrador del estudio</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nombre completo</Label>
                  <Input name="userName" required placeholder="Ej.: Juan Pérez" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input name="userEmail" type="email" required placeholder="juan@estudio.com" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Contraseña temporal</Label>
                  <Input name="password" type="password" required placeholder="Mínimo 8 caracteres" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="gap-1.5">
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Crear estudio
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={dialog?.type === "suspend"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Suspender estudio</DialogTitle>
            <DialogDescription>
              El estudio <strong>{dialog?.type === "suspend" ? dialog.firmName : ""}</strong> será suspendido temporalmente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Motivo de la suspensión</Label>
              <Textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Ej.: Falta de pago, solicitud del cliente, etc."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSuspendConfirm} disabled={isPending} className="gap-1.5 bg-amber-600 hover:bg-amber-700">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PauseCircle className="h-4 w-4" />}
              Suspender estudio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Delete Dialog */}
      <Dialog open={dialog?.type === "scheduleDelete"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Programar eliminación</DialogTitle>
            <DialogDescription>
              El estudio <strong>{dialog?.type === "scheduleDelete" ? dialog.firmName : ""}</strong> será marcado para eliminación.
              Los datos se conservarán durante <strong>30 días</strong> antes de eliminarse permanentemente.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-xs text-amber-700 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              Durante este período, los usuarios no podrán acceder al estudio. Podés cancelar la eliminación en cualquier momento.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleScheduleDeleteConfirm} disabled={isPending} className="gap-1.5" variant="destructive">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Programar eliminación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hard Delete Dialog */}
      <Dialog open={dialog?.type === "hardDelete"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Eliminación permanente</DialogTitle>
            <DialogDescription>
              Vas a eliminar <strong>PERMANENTEMENTE</strong> el estudio{" "}
              <strong>{dialog?.type === "hardDelete" ? dialog.firmName : ""}</strong> y{" "}
              <strong>TODOS sus datos</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-xs text-destructive flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              Esta acción es <strong>IRREVERSIBLE</strong>. Se eliminará el schema completo de la base de datos.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleHardDeleteConfirm} disabled={isPending} className="gap-1.5" variant="destructive">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Eliminar permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
