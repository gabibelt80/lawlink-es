"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ArrowRight, XCircle, Loader2, Clock, RotateCcw, AlertCircle } from "lucide-react";
import type { IntakeStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  declineIntake,
  convertIntakeToMatter,
  markIntakeNeedsRevision,
  resubmitIntake
} from "@/server/intakes/actions";
import { matterHref } from "@/lib/matters/route";

export function IntakeActions({
  intakeId,
  status
}: {
  intakeId: string;
  status?: IntakeStatus;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [dialogKind, setDialogKind] = useState<"decline" | "revision" | null>(null);
  const [reason, setReason] = useState("");

  const role = session?.user?.role;
  const canApprove = role === "ADMIN" || role === "PRINCIPAL_LAWYER";

  // Lado del abogado: estado Pendiente de corrección → muestra el botón «Reenviar»
  function handleResubmit() {
    if (!confirm("¿Confirmar el reenvío para aprobación?")) return;
    startTransition(async () => {
      try {
        await resubmitIntake(intakeId);
        toast.success("Reenviado para aprobación");
        router.refresh();
      } catch (err) {
        toast.error("Operación fallida", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  if (status === "NEEDS_REVISION") {
    return (
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700">
          <AlertCircle className="h-3.5 w-3.5" />
          Pendiente de corrección: después de completar los materiales podés reenviar
        </div>
        <Button size="sm" onClick={handleResubmit} disabled={isPending} className="gap-1.5">
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
          Reenviar
        </Button>
      </div>
    );
  }

  if (!canApprove) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        Pendiente de aprobación del administrador / abogado principal
      </div>
    );
  }

  function handleConvert() {
    if (!confirm("¿Confirmar la conversión a caso formal? Se asignará un número de caso.")) return;
    startTransition(async () => {
      try {
        const res = await convertIntakeToMatter(intakeId);
        toast.success(`Convertido a caso ${res.internalCode}`);
        router.push(matterHref({ id: res.matterId, internalCode: res.internalCode }));
      } catch (err) {
        toast.error("Error de conversión", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  function openDialog(kind: "decline" | "revision") {
    setReason("");
    setDialogKind(kind);
  }

  function handleConfirm() {
    if (!reason.trim()) {
      toast.warning(dialogKind === "decline" ? "Completá el motivo de rechazo" : "Completá la descripción de corrección");
      return;
    }
    startTransition(async () => {
      try {
        if (dialogKind === "decline") {
          await declineIntake({ id: intakeId, reason });
          toast.success("Marcado como rechazado");
        } else {
          await markIntakeNeedsRevision({ id: intakeId, reason });
          toast.success("Marcado como pendiente de corrección, el abogado puede completar y reenviar");
        }
        setDialogKind(null);
        router.refresh();
      } catch (err) {
        toast.error("Operación fallida", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  const isDecline = dialogKind === "decline";

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => openDialog("revision")}
          disabled={isPending}
          className="border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
        >
          <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
          Requiere corrección
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => openDialog("decline")}
          disabled={isPending}
          className="border-destructive/40 text-destructive hover:bg-destructive/10"
        >
          <XCircle className="mr-1.5 h-3.5 w-3.5" />
          Rechazar
        </Button>
        <Button
          size="sm"
          onClick={handleConvert}
          disabled={isPending}
          className="gap-1.5"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ArrowRight className="h-3.5 w-3.5" />
          )}
          Convertir a caso formal
        </Button>
      </div>

      <Dialog open={dialogKind !== null} onOpenChange={(o) => !o && setDialogKind(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isDecline ? "Marcar como rechazado" : "Marcar como pendiente de corrección"}</DialogTitle>
            <DialogDescription>
              {isDecline
                ? "Estado final: esta admisión no se convertirá en caso formal. Se conserva en el historial."
                : "Después de que el abogado complete los materiales, puede hacer clic en «Reenviar para aprobación», a diferencia del rechazo real."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-xs">
              {isDecline ? "Motivo de rechazo" : "Ítems a corregir"} *
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isDecline
                  ? "Ej.: ya existe un cliente con conflicto bloqueante / Cliente retirado / Fuera del alcance del negocio ..."
                  : "Ej.: falta escaneo de DNI / contrato de mandato sin firmar / explicación insuficiente del conflicto de intereses ..."
              }
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogKind(null)} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isPending || !reason.trim()}
              variant={isDecline ? "destructive" : "default"}
            >
              {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {isDecline ? "Confirmar rechazo" : "Marcar pendiente de corrección"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}