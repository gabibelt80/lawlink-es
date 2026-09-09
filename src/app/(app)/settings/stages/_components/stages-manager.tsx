"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  RotateCcw,
  Eye,
  EyeOff,
  Lock,
  Unlock,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Badge } from "@/components/ui/badge";
import type { ProcedureType } from "@prisma/client";

type StagePreset = {
  name: string;
  kind: "required" | "optional";
  description: string;
};

type ProcedureTypeInfo = {
  value: ProcedureType;
  label: string;
};

type CustomStage = {
  id: string;
  procedureType: ProcedureType;
  name: string;
  steps: any;
  isDefault: boolean;
};

export function StagesManager({
  procedureTypes,
  defaultStages,
  customStages,
}: {
  procedureTypes: ProcedureTypeInfo[];
  defaultStages: Record<string, StagePreset[]>;
  customStages: CustomStage[];
}) {
  const [selectedType, setSelectedType] = useState<ProcedureType>(procedureTypes[0].value);
  const [stages, setStages] = useState<StagePreset[]>(defaultStages[procedureTypes[0].value] ?? []);
  const [isPending, startTransition] = useTransition();
  const [editingStage, setEditingStage] = useState<{ index: number; stage: StagePreset } | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [addingStage, setAddingStage] = useState(false);

  const currentTypeLabel = procedureTypes.find((pt) => pt.value === selectedType)?.label ?? "";

  function switchType(type: ProcedureType) {
    setSelectedType(type);
    setStages(defaultStages[type] ?? []);
  }

  function handleDelete(index: number) {
    startTransition(async () => {
      try {
        const stage = stages[index];
        const { checkStageDeletionAction, hideStageAction } = await import("@/server/settings/stages-actions");
        const result = await checkStageDeletionAction({
          procedureType: selectedType,
          stageName: stage.name,
        });

        if (result.canDelete) {
          setStages((prev) => prev.filter((_, i) => i !== index));
          setDeletingIndex(null);
          toast.success("Etapa eliminada correctamente");
        } else {
          // No se puede eliminar, ofrecer ocultar
          const shouldHide = confirm(
            result.reason + "\n\n¿Querés ocultarla en su lugar? Los casos existentes la conservarán pero ya no aparecerá en nuevos casos."
          );
          if (shouldHide) {
            await hideStageAction({
              procedureType: selectedType,
              stageName: stage.name,
            });
            toast.success("Etapa ocultada correctamente");
            setDeletingIndex(null);
          }
        }
      } catch (err) {
        toast.error("Error al eliminar etapa", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  function handleSaveAll() {
    startTransition(async () => {
      try {
        const { saveStagesAction } = await import("@/server/settings/stages-actions");
        await saveStagesAction({
          procedureType: selectedType,
          stages,
        });
        toast.success("Etapas guardadas correctamente");
      } catch (err) {
        toast.error("Error al guardar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  function handleReset() {
    setStages(defaultStages[selectedType] ?? []);
    toast.info("Etapas restablecidas a los valores por defecto");
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-lg font-medium">Gestión de etapas por procedimiento</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Editá, eliminá o agregá etapas base para cada tipo de procedimiento.
          Los cambios se aplican a los casos nuevos. Los casos existentes conservan sus etapas.
        </p>
      </header>

      {/* Selector de tipo */}
      <div className="flex flex-wrap gap-2">
        {procedureTypes.map((pt) => (
          <button
            key={pt.value}
            onClick={() => switchType(pt.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              selectedType === pt.value
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {pt.label}
          </button>
        ))}
      </div>

      {/* Etapas */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium">
            Etapas de {currentTypeLabel} ({stages.length})
          </h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              className="gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restablecer
            </Button>
            <Button
              size="sm"
              onClick={() => setAddingStage(true)}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar etapa
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {stages.length === 0 && (
            <div className="rounded-lg border border-dashed border-border/60 py-12 text-center text-sm text-muted-foreground">
              No hay etapas definidas para este tipo de procedimiento.
            </div>
          )}
          {stages.map((stage, index) => (
            <div
              key={index}
              className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{stage.name}</span>
                  {stage.kind === "required" ? (
                    <Badge variant="green" className="text-[10px] gap-1">
                      <Lock className="h-3 w-3" />
                      Obligatoria
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Unlock className="h-3 w-3" />
                      Opcional
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{stage.description}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setEditingStage({ index, stage })}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-popover hover:text-foreground transition-colors"
                  title="Editar etapa"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeletingIndex(index)}
                  className="rounded-md p-1.5 text-destructive hover:bg-popover transition-colors"
                  title="Eliminar etapa"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleSaveAll} disabled={isPending} className="gap-1.5">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Guardar cambios
          </Button>
        </div>
      </div>

      {/* Diálogo de edición */}
      <Dialog open={!!editingStage} onOpenChange={(open) => !open && setEditingStage(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar etapa</DialogTitle>
          </DialogHeader>
          {editingStage && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre</Label>
                <Input
                  value={editingStage.stage.name}
                  onChange={(e) =>
                    setEditingStage((prev) =>
                      prev ? { ...prev, stage: { ...prev.stage, name: e.target.value } } : prev
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descripción</Label>
                <Input
                  value={editingStage.stage.description}
                  onChange={(e) =>
                    setEditingStage((prev) =>
                      prev ? { ...prev, stage: { ...prev.stage, description: e.target.value } } : prev
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <select
                  value={editingStage.stage.kind}
                  onChange={(e) =>
                    setEditingStage((prev) =>
                      prev
                        ? { ...prev, stage: { ...prev.stage, kind: e.target.value as "required" | "optional" } }
                        : prev
                    )
                  }
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs"
                >
                  <option value="required">Obligatoria</option>
                  <option value="optional">Opcional</option>
                </select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingStage(null)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (editingStage) {
                      setStages((prev) =>
                        prev.map((s, i) => (i === editingStage.index ? editingStage.stage : s))
                      );
                      setEditingStage(null);
                      toast.success("Etapa actualizada");
                    }
                  }}
                >
                  Guardar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de agregar */}
      <Dialog open={addingStage} onOpenChange={setAddingStage}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar etapa</DialogTitle>
            <DialogDescription>
              Se agregará a {currentTypeLabel}. Los casos nuevos incluirán esta etapa.
            </DialogDescription>
          </DialogHeader>
          <AddStageForm
            onAdd={(stage) => {
              setStages((prev) => [...prev, stage]);
              setAddingStage(false);
              toast.success("Etapa agregada");
            }}
            onCancel={() => setAddingStage(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Diálogo de eliminar */}
      <Dialog open={deletingIndex !== null} onOpenChange={(open) => !open && setDeletingIndex(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar etapa</DialogTitle>
            <DialogDescription>
              ¿Estás seguro que querés eliminar esta etapa? Los casos existentes que ya la
              tengan la conservarán, pero no aparecerá en casos nuevos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeletingIndex(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deletingIndex !== null && handleDelete(deletingIndex)}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddStageForm({
  onAdd,
  onCancel,
}: {
  onAdd: (stage: StagePreset) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"required" | "optional">("required");

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Nombre</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Revisión de legajo" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Descripción</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción de la etapa" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Tipo</Label>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as "required" | "optional")}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs"
        >
          <option value="required">Obligatoria</option>
          <option value="optional">Opcional</option>
        </select>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={() => {
            if (!name.trim()) {
              toast.error("El nombre es obligatorio");
              return;
            }
            onAdd({ name: name.trim(), description: description.trim() || "Sin descripción", kind });
          }}
        >
          Agregar
        </Button>
      </DialogFooter>
    </div>
  );
}
