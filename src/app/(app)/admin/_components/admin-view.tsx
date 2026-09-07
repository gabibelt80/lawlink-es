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
  ExternalLink,
  Users,
  Calendar,
  Package,
  PauseCircle,
  AlertTriangle,
  Undo2,
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
import { PLANS, getPlan } from "@/lib/plans";
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
  _count: { users: number };
};

export function AdminView({ firms, customModules }: { firms: FirmRow[]; customModules: Record<string, string[]> }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

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
        setCreateOpen(false);
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

  function handleSuspend(firmId: string, firmName: string) {
    const reason = prompt(`¿Motivo de la suspensión de "${firmName}"?`);
    startTransition(async () => {
      try {
        await suspendFirmAction({ firmId, reason: reason ?? undefined });
        toast.success("Estudio suspendido");
        router.refresh();
      } catch (err) {
        toast.error("Error al suspender", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  function handleScheduleDelete(firmId: string, firmName: string) {
    if (!confirm(`¿Programar eliminación de "${firmName}"?\n\nLos datos se conservarán 30 días antes de eliminarse permanentemente.`)) return;
    startTransition(async () => {
      try {
        await scheduleFirmDeletionAction({ firmId });
        toast.success("Eliminación programada (30 días)");
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

  function handleHardDelete(firmId: string, firmName: string) {
    if (!confirm(`⚠️ ADVERTENCIA: Vas a eliminar PERMANENTEMENTE "${firmName}" y TODOS sus datos.\n\nEsta acción es IRREVERSIBLE. ¿Continuar?`)) return;
    startTransition(async () => {
      try {
        await hardDeleteFirmAction({ firmId });
        toast.success("Estudio eliminado permanentemente");
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
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Panel de administración
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Gestioná todos los estudios jurídicos registrados en Juridictas.ar
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
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Nuevo estudio
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total estudios" value={firms.length} />
        <StatCard label="Estudios activos" value={firms.filter((f) => f.active && !f.deletedAtScheduled).length} />
        <StatCard label="Suspendidos" value={firms.filter((f) => f.suspendedAt && !f.deletedAtScheduled).length} />
        <StatCard label="Con eliminación programada" value={firms.filter((f) => f.deletedAtScheduled).length} />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-normal">Estudio</th>
              <th className="px-4 py-2 text-left font-normal">Plan</th>
              <th className="px-4 py-2 text-left font-normal">Módulos</th>
              <th className="px-4 py-2 text-left font-normal">Usuarios</th>
              <th className="px-4 py-2 text-left font-normal">Estado</th>
              <th className="px-4 py-2 text-right font-normal">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {firms.map((f) => {
              const modules = customModules[f.plan] ?? getPlanModules(f.plan);
              const isScheduled = !!f.deletedAtScheduled;
              const isSuspended = !!f.suspendedAt && !f.deletedAtScheduled;
              return (
                <tr
                  key={f.id}
                  className={cn(
                    "hover:bg-muted/20 transition-colors",
                    isScheduled && "opacity-50",
                    isSuspended && "bg-amber-500/5"
                  )}
                >
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{f.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {f.slug}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{f.email}</div>
                    {isSuspended && f.suspensionReason && (
                      <div className="mt-1 text-[10px] text-amber-600">
                        {f.suspensionReason}
                      </div>
                    )}
                    {isScheduled && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        Se eliminará el {new Date(f.deletedAtScheduled!).toLocaleDateString("es-AR")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
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
                            {PLANS[key].label} {PLANS[key].price > 0 ? `- $${(PLANS[key].price / 1000).toFixed(1)}k` : "Gratis"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Package className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs">{modules.length} módulos</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Users className="h-3 w-3" />
                      {f._count.users}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
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
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      {isScheduled ? (
                        <>
                          <button
                            onClick={() => handleCancelDelete(f.id)}
                            className="rounded-md p-1.5 text-emerald-600 hover:bg-popover"
                            title="Cancelar eliminación"
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleHardDelete(f.id, f.name)}
                            className="rounded-md p-1.5 text-destructive hover:bg-popover"
                            title="Eliminar ahora permanentemente"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <a
                            href={`http://juridictas.ar/${f.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-popover hover:text-primary"
                            title="Abrir estudio"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          {!isSuspended && f.active && (
                            <button
                              onClick={() => handleSuspend(f.id, f.name)}
                              className="rounded-md p-1.5 text-amber-600 hover:bg-popover"
                              title="Suspender estudio"
                            >
                              <PauseCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleScheduleDelete(f.id, f.name)}
                            className="rounded-md p-1.5 text-destructive hover:bg-popover"
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo estudio jurídico</DialogTitle>
            <DialogDescription>
              Se creará automáticamente el schema y el usuario administrador del estudio.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre del estudio</Label>
              <Input name="firmName" required placeholder="Ej.: Estudio Perez & Asociados" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email del estudio</Label>
              <Input name="firmEmail" type="email" required placeholder="contacto@estudio.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre del administrador</Label>
              <Input name="userName" required placeholder="Ej.: Juan Pérez" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email del administrador</Label>
              <Input name="userEmail" type="email" required placeholder="juan@estudio.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Contraseña temporal</Label>
              <Input name="password" type="password" required placeholder="Minimo 8 caracteres" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={isPending}>
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
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl tabular text-foreground">{value}</div>
    </div>
  );
}