"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Archive,
  Pause,
  Play,
  Loader2,
  MoreHorizontal,
  Lock,
  Download
} from "lucide-react";
import type { MatterStatus } from "@prisma/client";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  closeMatter,
  reopenMatter,
  holdMatter
} from "@/server/matters/lifecycle";
import { ArchiveWizardDialog } from "./archive-wizard";

export function LifecycleActions({
  matterId,
  status,
  canArchive
}: {
  matterId: string;
  status: MatterStatus;
  canArchive: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<"close" | "hold" | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [text, setText] = useState("");

  const isArchived = status === "ARCHIVED";

  function open(d: "close" | "hold") {
    setText("");
    setDialog(d);
  }

  function handleSubmit() {
    if (dialog === "close" && !text.trim()) {
      toast.warning("Complete el resumen de cierre");
      return;
    }
    startTransition(async () => {
      try {
        if (dialog === "close") {
          await closeMatter({ id: matterId, summary: text });
          toast.success("Caso cerrado");
        } else if (dialog === "hold") {
          await holdMatter({ id: matterId, reason: text });
          toast.success("Caso suspendido");
        }
        setDialog(null);
        router.refresh();
      } catch (err) {
        toast.error("Operacion fallida", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  function handleReopen() {
    if (!confirm("Reabrir el caso como 'En tramite'?")) return;
    startTransition(async () => {
      try {
        await reopenMatter(matterId);
        toast.success("Caso reabierto");
        router.refresh();
      } catch (err) {
        toast.error("Operacion fallida", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  if (isArchived) {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#9B7BF7]/30 bg-[#9B7BF7]/10 px-3 py-1.5 text-xs text-[#9B7BF7]">
          <Lock className="h-3.5 w-3.5" />
          Archivado (solo lectura)
        </span>
        <a
          href={`/api/archive/${matterId}/export`}
          className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-xs hover:bg-muted/30"
          title="Exportar ZIP de archivo (incluye materiales + datos estructurados + portada)"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar ZIP
        </a>
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isPending} className="gap-1.5">
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreHorizontal className="h-3.5 w-3.5" />}
            Estado
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {(status === "ON_HOLD" || status === "CLOSED") && (
            <DropdownMenuItem onSelect={handleReopen}>
              <Play className="mr-2 h-4 w-4" />
              Reabrir
            </DropdownMenuItem>
          )}
          {status === "IN_PROGRESS" && (
            <DropdownMenuItem onSelect={() => open("hold")}>
              <Pause className="mr-2 h-4 w-4" />
              Suspender
            </DropdownMenuItem>
          )}
          {status !== "CLOSED" && (
            <DropdownMenuItem onSelect={() => open("close")}>
              <CheckCircle2 className="mr-2 h-4 w-4 text-[#4ADE80]" />
              Cerrar caso
            </DropdownMenuItem>
          )}
          {canArchive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setArchiveOpen(true)}
                className="text-[#9B7BF7] focus:text-[#9B7BF7]"
              >
                <Archive className="mr-2 h-4 w-4" />
                Archivar (irreversible)
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === "close" ? "Cerrar caso" : "Suspender caso"}</DialogTitle>
            <DialogDescription>
              {dialog === "close" &&
                "Despues de cerrar, el estado sera 'Cerrado' y se podra editar. El resumen ingresara en la linea de tiempo."}
              {dialog === "hold" && "Despues de suspender, el caso no se mostrara en el filtro 'En tramite'."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label className="text-xs">
              {dialog === "close" ? "Resumen de cierre" : "Motivo de suspension"}
              {dialog === "close" && <span className="ml-1 text-destructive">*</span>}
            </Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                dialog === "close"
                  ? "Ej.: sentencia de primera instancia favorable, la contraparte no apelo, sentencia firme"
                  : "Ej.: a la espera de que el cliente aporte evidencia complementaria"
              }
              rows={5}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {dialog === "close" ? "Confirmar cierre" : "Confirmar suspension"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ArchiveWizardDialog
        matterId={matterId}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
      />
    </>
  );
}