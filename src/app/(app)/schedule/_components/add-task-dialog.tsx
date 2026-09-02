"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Clock } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTask } from "@/server/tasks/actions";

type MatterPickerItem = { id: string; internalCode: string; title: string };

export function AddTaskDialog({
  open,
  onOpenChange,
  date,
  matters,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  date: Date | null;
  matters: MatterPickerItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [matterId, setMatterId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<0 | 1 | 2>(0);
  const [allDay, setAllDay] = useState(false);
  const [time, setTime] = useState("09:00");

  useEffect(() => {
    if (!open) return;
    setMatterId("");
    setTitle("");
    setDescription("");
    setPriority(0);
    setAllDay(false);
    setTime("09:00");
  }, [open]);

  function submit() {
    if (!matterId) {
      toast.warning("Seleccioná un Caso asociado");
      return;
    }
    if (!title.trim()) {
      toast.warning("Completá el título de la tarea");
      return;
    }
    if (!date) {
      toast.warning("Falta la fecha");
      return;
    }

    // Construir dueAt: todo el día → 23:59; con hora → analizar HH:MM
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
        toast.success("Tarea agregada");
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error("Error al agregar", {
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
            <Plus className="h-4 w-4 text-primary" />
            Agregar tarea
          </DialogTitle>
          <DialogDescription className="text-xs">
            {date
              ? date.toLocaleDateString("es-AR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                })
              : "—"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">
              Caso asociado <span className="text-destructive">*</span>
            </Label>
            <Select value={matterId} onValueChange={setMatterId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {matters.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="font-mono text-[10.5px] text-muted-foreground">
                      {m.internalCode}
                    </span>
                    <span className="ml-2">{m.title}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Título de la tarea <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Ej.: Redactar demanda / Enviar lista de pruebas"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              Hora
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                step={300}
                value={time}
                disabled={allDay}
                onChange={(e) => setTime(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 font-mono text-sm tabular disabled:opacity-50"
              />
              <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                Todo el día
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Descripción (opcional)</Label>
            <Textarea
              rows={2}
              placeholder="Detalle de la tarea, materiales relacionados, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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