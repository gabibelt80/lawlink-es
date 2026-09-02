"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createTask } from "@/server/tasks/actions";

/**
 * v0.16: Caso详情"重要时限yRecordatorios"卡内的新建 Dialog
 * 复用 Task 表（matterId + title + dueAt + description + priority）
 */
export function AddReminderDialog({
  open,
  onOpenChange,
  matterId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  matterId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [time, setTime] = useState("09:00");
  const [allDay, setAllDay] = useState(false);
  const [priority, setPriority] = useState<0 | 1 | 2>(0);
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDate(new Date().toISOString().slice(0, 10));
    setTime("09:00");
    setAllDay(false);
    setPriority(0);
    setDescription("");
  }, [open]);

  function submit() {
    if (!title.trim()) {
      toast.warning("Por favor complete el título del recordatorio");
      return;
    }
    if (!date) {
      toast.warning("Seleccione la Fecha");
      return;
    }

    const dueAt = new Date(date);
    if (allDay) {
      dueAt.setHours(23, 59, 0, 0);
    } else {
      const [hh, mm] = time.split(":").map(Number);
      if (Number.isFinite(hh) && Number.isFinite(mm)) {
        dueAt.setHours(hh, mm, 0, 0);
      }
    }

    startTransition(async () => {
      try {
        await createTask({
          matterId,
          title: title.trim(),
          description,
          dueAt,
          priority,
          assigneeId: "",
          stageId: "",
        });
        toast.success("Se agregó");
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error("No se pudo agregar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Agregar plazo importante / Recordatorios
          </DialogTitle>
          <DialogDescription className="text-xs">
            Se puede usar como Fecha límite, hito clave o un Recordatorio
            personalizado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Ej.: Enviar alegato / Pagar Preservación / Enviar lista de pruebas"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Fecha <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hora</Label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  step={300}
                  value={time}
                  disabled={allDay}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-9 flex-1 rounded-md border border-input bg-background px-2 font-mono text-sm tabular disabled:opacity-50"
                />
                <label className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                    className="h-3 w-3"
                  />
                  Todo el día
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Prioridad</Label>
            <div className="flex gap-2">
              {[
                { value: 0, label: "Normal" },
                { value: 1, label: "Alta" },
                { value: 2, label: "Urgente" },
              ].map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value as 0 | 1 | 2)}
                  className={
                    priority === p.value
                      ? "rounded-md border border-primary bg-primary/15 px-3 py-1 text-xs text-primary"
                      : "rounded-md border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-input hover:bg-muted hover:text-foreground"
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Observaciones (opcional)</Label>
            <Textarea
              rows={2}
              placeholder="Agregue detalles, materiales relacionados, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button onClick={submit} disabled={isPending} className="gap-1.5">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
