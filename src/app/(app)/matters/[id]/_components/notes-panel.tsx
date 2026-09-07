"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  Phone,
  MessageCircle,
  Mail,
  Users,
  Gavel,
  Loader2,
  Trash2,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from "@/components/ui/sheet";
import { createNote, deleteNote } from "@/server/notes/actions";
import type { NotePayload } from "./matter-detail-tabs";
import { cn } from "@/lib/utils";

const channelMeta = {
  PHONE: { icon: Phone, label: "Teléfono", color: "#4ADE80" },
  WECHAT: { icon: MessageCircle, label: "WhatsApp", color: "#4FD1C5" },
  EMAIL: { icon: Mail, label: "Email", color: "#5B8DEF" },
  MEETING: { icon: Users, label: "Reunión", color: "#9B7BF7" },
  COURT: { icon: Gavel, label: "Tribunal", color: "#FBBF24" },
  OTHER: { icon: MessageSquare, label: "Otro", color: "#9BA8C7" }
} as const;

const formSchema = z.object({
  matterId: z.string().cuid(),
  channel: z.enum(["PHONE", "WECHAT", "EMAIL", "MEETING", "COURT", "OTHER"]),
  withWhom: z.string().max(80).optional().or(z.literal("")),
  occurredAt: z.coerce.date(),
  content: z.string().min(1, "El contenido es obligatorio").max(5000)
});

type FormValues = z.infer<typeof formSchema>;

export function NotesPanel({
  matterId,
  notes
}: {
  matterId: string;
  notes: NotePayload[];
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar este registro de comunicación?")) return;
    startTransition(async () => {
      try {
        await deleteNote(id);
        toast.success("Registro eliminado");
      } catch (err) {
        toast.error("Error al eliminar", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Ordenado por fecha descendente. Cada registro queda en la auditoría.
        </p>
        <Button
          onClick={() => setSheetOpen(true)}
          size="sm"
          className="gap-1.5 "
        >
          <Plus className="h-4 w-4" />
          Nueva comunicación
        </Button>
      </header>

      {notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Todavía no hay registros. Clic en <span className="text-foreground">Nueva comunicación</span> para comenzar
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => {
            const meta = channelMeta[n.channel];
            const Icon = meta.icon;
            return (
              <li
                key={n.id}
                className="group rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border"
                    style={{ borderColor: `${meta.color}40`, color: meta.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        style={{ borderColor: `${meta.color}40`, color: meta.color }}
                      >
                        {meta.label}
                      </Badge>
                      {n.withWhom && (
                        <span className="text-xs text-muted-foreground">
                          con <span className="text-foreground">{n.withWhom}</span>
                        </span>
                      )}
                      <span className="font-mono text-xs text-muted-foreground tabular">
                        {new Date(n.occurredAt).toLocaleString("es-AR", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{n.author.name}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">
                      {n.content}
                    </p>
                    {(n.tags as string[]).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(n.tags as string[]).map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px]">
                            #{t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(n.id)}
                    disabled={isPending}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <NoteSheet matterId={matterId} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}

function NoteSheet({
  matterId,
  open,
  onOpenChange
}: {
  matterId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      matterId,
      channel: "PHONE",
      withWhom: "",
      occurredAt: new Date(),
      content: ""
    }
  });

  const channel = useWatch({ control, name: "channel" });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        await createNote({ ...values, tags: [] });
        toast.success("Comunicación guardada");
        reset({
          matterId,
          channel: "PHONE",
          withWhom: "",
          occurredAt: new Date(),
          content: ""
        });
        onOpenChange(false);
      } catch (err) {
        toast.error("Error al guardar", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-md flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border bg-background px-6 py-4">
          <SheetTitle>Nueva comunicación</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
            <div className="space-y-2">
              <Label className="text-xs">Canal de comunicación</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["PHONE", "WECHAT", "EMAIL", "MEETING", "COURT", "OTHER"] as const).map(
                  (c) => {
                    const meta = channelMeta[c];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setValue("channel", c)}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors",
                          channel === c
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border bg-background text-muted-foreground hover:border-input hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {meta.label}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Persona</Label>
              <Input placeholder="Ej.: Juan Pérez / Juez principal" {...register("withWhom")} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Fecha y hora</Label>
              <Input
                type="datetime-local"
                {...register("occurredAt", { valueAsDate: true })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">
                Contenido <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={8}
                placeholder="Registrá brevemente el contenido, la opinión de la otra parte, los temas acordados, etc."
                {...register("content")}
              />
              {errors.content && (
                <p className="text-xs text-destructive">{errors.content.message}</p>
              )}
            </div>
          </div>

          <SheetFooter className="border-t border-border bg-background px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="gap-1.5">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };