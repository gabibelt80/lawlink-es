"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { CustomFieldDef } from "@prisma/client";
import { Plus, Pencil, Trash2, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCustomFieldDef,
  updateCustomFieldDef,
  deleteCustomFieldDef,
  toggleCustomFieldDef,
} from "@/server/custom-fields/actions";

const TYPE_LABEL: Record<CustomFieldDef["fieldType"], string> = {
  TEXT: "Texto",
  NUMBER: "Número",
  DATE: "Fecha",
  SELECT: "Desplegable",
};

export function CustomFieldsView({
  matterFields,
}: {
  matterFields: CustomFieldDef[];
}) {
  const [editing, setEditing] = useState<CustomFieldDef | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string, label: string) {
    if (
      !confirm(
        `¿Eliminar el campo personalizado «${label}»? Los valores ya ingresados dejarán de mostrarse.`,
      )
    )
      return;
    startTransition(async () => {
      try {
        await deleteCustomFieldDef(id);
        toast.success("Eliminado");
      } catch (err) {
        toast.error("Error al eliminar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  function handleToggle(id: string, enabled: boolean) {
    startTransition(async () => {
      try {
        await toggleCustomFieldDef(id, enabled);
      } catch (err) {
        toast.error("Operación fallida", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-medium">
            <ListChecks className="h-4 w-4 text-primary" />
            Campos personalizados del caso
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Agregá campos exclusivos de tu institución para completar al crear o
            editar el detalle del caso.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Agregar campo
        </Button>
      </header>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
              <th className="px-4 py-2 font-medium">Nombre del campo</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Obligatorio</th>
              <th className="px-4 py-2 font-medium">Opciones</th>
              <th className="px-4 py-2 font-medium">Habilitado</th>
              <th className="px-4 py-2 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {matterFields.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Todavía no hay campos personalizados. Hacé clic en «Agregar
                  campo» en la esquina superior derecha.
                </td>
              </tr>
            ) : (
              matterFields.map((f) => (
                <tr
                  key={f.id}
                  className="border-b border-border/60 last:border-0"
                >
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    {f.label}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {TYPE_LABEL[f.fieldType]}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {f.required ? "Sí" : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {f.fieldType === "SELECT" && f.options.length > 0
                      ? f.options.join(" / ")
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <Switch
                      checked={f.enabled}
                      onCheckedChange={(v) => handleToggle(f.id, v)}
                      disabled={pending}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setEditing(f)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={() => handleDelete(f.id, f.label)}
                        disabled={pending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <FieldFormDialog
        key={editing?.id ?? "create"}
        open={createOpen || !!editing}
        field={editing}
        onClose={() => {
          setCreateOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

function FieldFormDialog({
  open,
  field,
  onClose,
}: {
  open: boolean;
  field: CustomFieldDef | null;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(field?.label ?? "");
  const [fieldType, setFieldType] = useState<CustomFieldDef["fieldType"]>(
    field?.fieldType ?? "TEXT",
  );
  const [required, setRequired] = useState(field?.required ?? false);
  const [optionsText, setOptionsText] = useState(
    (field?.options ?? []).join("\n"),
  );
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!label.trim()) {
      toast.warning("Completá el nombre del campo");
      return;
    }
    const options =
      fieldType === "SELECT"
        ? optionsText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
    if (fieldType === "SELECT" && options.length === 0) {
      toast.warning("Para el tipo desplegable completá al menos una opción (una por línea)");
      return;
    }
    startTransition(async () => {
      try {
        if (field) {
          await updateCustomFieldDef({
            id: field.id,
            label,
            fieldType,
            required,
            options,
          });
        } else {
          await createCustomFieldDef({
            entityType: "MATTER",
            label,
            fieldType,
            required,
            options,
          });
        }
        toast.success(field ? "Actualizado" : "Agregado");
        onClose();
      } catch (err) {
        toast.error("Error al guardar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{field ? "Editar campo" : "Agregar campo"}</DialogTitle>
          <DialogDescription>
            El campo aparecerá en «Información personalizada» del detalle del caso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Nombre del campo
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ej.: número interno de gestión"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Tipo de campo
            </label>
            <Select
              value={fieldType}
              onValueChange={(v) =>
                setFieldType(v as CustomFieldDef["fieldType"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TEXT">Texto</SelectItem>
                <SelectItem value="NUMBER">Número</SelectItem>
                <SelectItem value="DATE">Fecha</SelectItem>
                <SelectItem value="SELECT">Desplegable</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {fieldType === "SELECT" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Valores de opciones (una por línea)
              </label>
              <textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder={"Opción uno\nOpción dos"}
              />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={required} onCheckedChange={setRequired} />
            Obligatorio
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {field ? "Guardar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}