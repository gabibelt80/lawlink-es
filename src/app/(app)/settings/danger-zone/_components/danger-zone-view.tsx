"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Trash2,
  Download,
  Loader2,
  Undo2,
  FileWarning,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  requestFirmDeletionAction,
  cancelFirmDeletionRequestAction,
} from "@/server/settings/delete-firm-actions";

type DangerZoneProps = {
  firm: {
    id: string;
    name: string;
    deletedAtScheduled: Date | null;
    subscriptionStatus: string;
  };
};

export function DangerZoneView({ firm }: DangerZoneProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();

  const isDeletionScheduled = !!firm.deletedAtScheduled;
  const daysRemaining = isDeletionScheduled
    ? Math.max(
        0,
        Math.ceil(
          (new Date(firm.deletedAtScheduled!).getTime() - Date.now()) /
            (24 * 60 * 60 * 1000)
        )
      )
    : 0;

  const deletionDate = isDeletionScheduled
    ? new Date(firm.deletedAtScheduled!).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  function handleRequestDeletion() {
    startTransition(async () => {
      try {
        await requestFirmDeletionAction({
          acceptedTerms: accepted,
          confirmation,
        });
        toast.success("Proceso de eliminación iniciado", {
          description:
            "Tenés 30 días para descargar todos tus datos antes de la eliminación definitiva.",
        });
        setDialogOpen(false);
        setAccepted(false);
        setConfirmation("");
        window.location.reload();
      } catch (err) {
        toast.error("Error al solicitar eliminación", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  function handleCancelDeletion() {
    startTransition(async () => {
      try {
        await cancelFirmDeletionRequestAction();
        toast.success("Proceso de eliminación cancelado");
        window.location.reload();
      } catch (err) {
        toast.error("Error al cancelar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Estado: eliminación ya programada (cuenta atrás)
  // ─────────────────────────────────────────────────────────────
  if (isDeletionScheduled) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <FileWarning className="h-6 w-6 shrink-0 text-amber-500" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-amber-700">
                Estudio en proceso de eliminación
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                El estudio <strong className="text-foreground">{firm.name}</strong>{" "}
                será eliminado definitivamente el{" "}
                <strong className="text-amber-700">{deletionDate}</strong>.
              </p>

              {/* Contador */}
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-background p-3">
                <Clock className="h-5 w-5 shrink-0 text-amber-600" />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">
                    Tiempo restante
                  </div>
                  <div className="text-lg font-semibold text-amber-700">
                    {daysRemaining} {daysRemaining === 1 ? "día" : "días"}
                  </div>
                </div>
              </div>

              {/* Qué podés hacer */}
              <div className="mt-4 rounded-lg border border-border bg-card p-4">
                <div className="flex items-start gap-2">
                  <Download className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="flex-1 space-y-1.5 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">
                      Todavía podés descargar todos tus datos
                    </p>
                    <p>
                      Durante los próximos <strong>{daysRemaining} días</strong>{" "}
                      tenés acceso completo al estudio para descargar casos,
                      clientes, documentos, plantillas y toda la información que
                      necesites conservar.
                    </p>
                    <p>
                      Andá a{" "}
                      <strong className="text-foreground">
                        Archivo → Explorador de carpetas
                      </strong>{" "}
                      para seleccionar y descargar los documentos de tus casos.
                    </p>
                  </div>
                </div>
              </div>

              {/* Aviso irreversible */}
              <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <p className="text-xs text-destructive">
                    <strong>Una vez transcurridos los 30 días</strong> el estudio
                    se eliminará por completo — casos, clientes, documentos,
                    usuarios y configuraciones. <strong>No hay forma de recuperarlo.</strong>
                  </p>
                </div>
              </div>

              {/* Cancelar */}
              <Button
                variant="outline"
                onClick={handleCancelDeletion}
                disabled={isPending}
                className="mt-4 gap-1.5"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Undo2 className="h-4 w-4" />
                )}
                Cancelar proceso de eliminación
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Estado: sin eliminación programada (opción de solicitar)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <AlertTriangle className="h-6 w-6 shrink-0 text-destructive" />
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-destructive">
            Eliminar estudio jurídico
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Iniciar el proceso de eliminación de{" "}
            <strong className="text-foreground">{firm.name}</strong>. No se
            elimina de inmediato: tenés <strong>30 días</strong> para descargar
            todos tus datos antes de la eliminación definitiva.
          </p>

          {/* Cómo funciona el proceso */}
          <div className="mt-4 rounded-lg border border-border bg-card p-4">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="flex-1 space-y-2 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">
                  Cómo funciona el proceso
                </p>
                <ol className="list-decimal space-y-1 pl-4">
                  <li>
                    Al confirmar, el estudio <strong>no se elimina al instante</strong>:
                    entra en un período de gracia de <strong>30 días</strong>.
                  </li>
                  <li>
                    Durante esos 30 días vas a poder{" "}
                    <strong className="text-foreground">
                      descargar todos los datos de tu estudio
                    </strong>{" "}
                    (casos, clientes, documentos, plantillas, etc.).
                  </li>
                  <li>
                    Si te arrepentís, podés <strong>cancelar el proceso</strong> en
                    cualquier momento desde esta misma página.
                  </li>
                  <li>
                    Al cumplirse los 30 días, el estudio y toda su información se
                    eliminan <strong className="text-destructive">definitivamente</strong>{" "}
                    del sistema.
                  </li>
                </ol>
              </div>
            </div>
          </div>

          <Button
            variant="destructive"
            onClick={() => setDialogOpen(true)}
            className="mt-4 gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            Iniciar proceso de eliminación
          </Button>
        </div>
      </div>

      {/* Diálogo de confirmación */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Iniciar eliminación de estudio
            </DialogTitle>
            <DialogDescription>
              Estás a punto de iniciar el proceso de eliminación de{" "}
              <strong className="text-foreground">{firm.name}</strong>. No se
              elimina de inmediato: tenés 30 días para descargar tus datos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-xs leading-relaxed text-amber-800">
                <strong>Proceso de eliminación:</strong>
                <br />
                1. A partir de ahora, tenés <strong>30 días</strong> para
                descargar todos tus datos.
                <br />
                2. Durante ese período, el estudio sigue activo y podés acceder a{" "}
                <strong>Archivo → Explorador de carpetas</strong> para descargar
                tus documentos.
                <br />
                3. Podés <strong>cancelar el proceso</strong> en cualquier momento
                desde esta página, sin consecuencias.
                <br />
                4. Al finalizar los 30 días, se eliminará{" "}
                <strong>PERMANENTEMENTE</strong> todo el estudio y sus datos.{" "}
                <strong>No hay forma de recuperarlos.</strong>
              </p>
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="accept-terms"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border"
              />
              <label
                htmlFor="accept-terms"
                className="cursor-pointer text-xs text-muted-foreground"
              >
                Entiendo que el proceso de eliminación tiene un período de gracia
                de <strong>30 días</strong>, que debo descargar mis datos antes de
                ese plazo, y que al cumplirse se eliminará todo de forma
                irreversible.
              </label>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">
                Escribí{" "}
                <span className="font-mono text-destructive">ELIMINAR</span> para
                confirmar
              </Label>
              <Input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="ELIMINAR"
                className="font-mono"
                disabled={!accepted}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRequestDeletion}
              disabled={!accepted || confirmation !== "ELIMINAR" || isPending}
              className="gap-1.5"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Iniciar proceso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
