"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import {
  createFirmAction,
  deleteFirmAction,
  toggleFirmActiveAction,
  updateFirmPlanAction,
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
  _count: { users: number };
};

export function AdminView({ firms }: { firms: FirmRow[] }) {
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

  function handleDelete(firmId: string, firmName: string) {
    if (!confirm(`¿Eliminar el estudio «${firmName}»? Esta accion es irreversible.`)) return;
    startTransition(async () => {
      try {
        await deleteFirmAction({ firmId });
        toast.success("Estudio eliminado");
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
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Nuevo estudio
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total estudios" value={firms.length} />
        <StatCard label="Estudios activos" value={firms.filter((f) => f.active).length} />
        <StatCard
          label="Usuarios totales"
          value={firms.reduce((acc, f) => acc + f._count.users, 0)}
        />
        <StatCard
          label="Plan trial"
          value={firms.filter((f) => f.plan === "trial").length}
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-normal">Estudio</th>
              <th className="px-4 py-2 text-left font-normal">Plan</th>
              <th className="px-4 py-2 text-left font-normal">Usuarios</th>
              <th className="px-4 py-2 text-left font-normal">Límite</th>
              <th className="px-4 py-2 text-left font-normal">Vence</th>
              <th className="px-4 py-2 text-left font-normal">Estado</th>
              <th className="px-4 py-2 text-right font-normal">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {firms.map((f) => {
              const plan = getPlan(f.plan);
              return (
                <tr key={f.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{f.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {f.slug}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{f.email}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Select
                      value={f.plan}
                      onValueChange={(v) => handlePlanChange(f.id, v)}
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
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Users className="h-3 w-3" />
                      {f._count.users}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    <span className="font-mono">{f.maxUsers} usuarios</span>
                    <br />
                    <span className="text-muted-foreground">{f.maxBranch} sucursales</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {f.plan === "trial" && f.planExpiresAt ? (
                      <span className="inline-flex items-center gap-1 text-amber-600">
                        <Calendar className="h-3 w-3" />
                        {new Date(f.planExpiresAt).toLocaleDateString("es-AR")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => handleToggle(f.id)}
                      className="inline-flex items-center gap-1"
                    >
                      {f.active ? (
                        <Badge variant="success" className="text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <XCircle className="h-3 w-3" />
                          Inactivo
                        </Badge>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <a
                        href={`http://juridictas.ar/${f.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-popover hover:text-primary"
                        title="Abrir estudio"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => handleDelete(f.id, f.name)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-popover hover:text-destructive"
                        title="Eliminar estudio"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
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