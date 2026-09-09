"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Trash2,
  Download,
  Loader2,
  Undo2,
  CheckCircle2,
  FileWarning,
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

  function handleRequestDeletion() {
    startTransition(async () => {
      try {
        await requestFirmDeletionAction({
          acceptedTerms: accepted,
          confirmation,
        });
        toast.success("Solicitud de eliminación iniciada", {
          description: "Tenés 30 días para descargar todos tus archivos.",
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
        toast.success("Solicitud de eliminación cancelada");
        window.location.reload();
      } catch (err) {
        toast.error("Error al cancelar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  if (isDeletionScheduled) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-6">
        <div className="flex items-start gap-3">
          <FileWarning className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-amber-700">
              Estudio en proceso de eliminación
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tu estudio <strong>{firm.name}</strong> será eliminado permanentemente en{" "}
              <strong className="text-amber-700">{daysRemaining} días</strong> (
              {new Date(firm.deletedAtScheduled!).toLocaleDateString("es-AR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              ).
            </p>
            <div className="mt-4 rounded-lg bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground flex items-start gap-2">
                <Download className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>
                  Tenés <strong>{daysRemaining} días</strong> para descargar todos tus archivos.
                  Andá a <strong>Archivo → Explorador de carpetas</strong> para seleccionar y
                  descargar todos los documentos de tus casos.
                </span>
              </p>
            </div>
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-xs text-destructive flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  <strong>Esta acción es IRREVERSIBLE.</strong> Una vez transcurridos los 30 días,
                  se eliminará el estudio completo y todos sus datos de la base de datos.
                  No hay forma de recuperarlos.
                </span>
              </p>
            </div>
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
              Cancelar eliminación
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-destructive">
            Zona de peligro
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Eliminar tu estudio jurídico es una acción irreversible. Todos los casos,
            clientes, documentos y configuraciones se eliminarán permanentemente.
          </p>
          <Button
            variant="destructive"
            onClick={() => setDialogOpen(true)}
            className="mt-4 gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            Solicitar eliminación del estudio
          </Button>
        </div>
      </div>

      {/* Diálogo de confirmación */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Eliminación de estudio
            </DialogTitle>
            <DialogDescription>
              Estás a punto de solicitar la eliminación de <strong>{firm.name}</strong>.
              Este proceso es irreversible.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4">
              <p className="text-xs text-amber-700 leading-relaxed">
                <strong>Proceso de eliminación:</strong>
                <br />
                1. A partir de ahora, tenés <strong>30 días</strong> para descargar todos tus archivos.
                <br />
                2. Durante ese período, podés acceder a{" "}
                <strong>Archivo → Explorador de carpetas</strong> para descargar tus documentos.
                <br />
                3. Al finalizar los 30 días, se eliminará <strong>PERMANENTEMENTE</strong> todo el
                estudio y sus datos. <strong>No hay forma de recuperarlos.</strong>
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
              <label htmlFor="accept-terms" className="text-xs text-muted-foreground cursor-pointer">
                He leído y acepto el proceso de eliminación. Entiendo que es irreversible y
                que debo descargar mis archivos antes de los 30 días.
              </label>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">
                Escribí <span className="font-mono text-destructive">ELIMINAR</span> para confirmar
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

          <DialogFooter>
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
              Confirmar eliminación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
