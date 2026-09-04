"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Plus, FileText, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  listWritings,
  createWriting,
  updateWriting,
  deleteWriting,
  syncWritingsFromFolder,
} from "@/server/writings/actions";

const WRITING_CATEGORIES = [
  "DEMANDA",
  "CONTESTACION",
  "OFICIO",
  "CEDULA",
  "RECURSO",
  "CARTA_DOCUMENTO",
  "OTRO",
] as const;

const WRITING_STAGES = [
  "ETAPA_ADMINISTRATIVA",
  "PRIMERA_INSTANCIA",
  "SEGUNDA_INSTANCIA",
  "EJECUCION",
  "TODAS",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  DEMANDA: "Demanda",
  CONTESTACION: "Contestacion",
  OFICIO: "Oficio",
  CEDULA: "Cedula",
  RECURSO: "Recurso",
  CARTA_DOCUMENTO: "Carta documento",
  OTRO: "Otro",
};

const STAGE_LABELS: Record<string, string> = {
  ETAPA_ADMINISTRATIVA: "Etapa administrativa",
  PRIMERA_INSTANCIA: "Primera instancia",
  SEGUNDA_INSTANCIA: "Segunda instancia",
  EJECUCION: "Ejecucion",
  TODAS: "Todas las etapas",
};

type Writing = {
  id: string;
  name: string;
  category: string;
  stage: string;
  content: string;
  enabled: boolean;
};

export function WritingsLibraryView() {
  const [writings, setWritings] = useState<Writing[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Writing | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadWritings();
  }, []);

  function loadWritings() {
    setLoading(true);
    listWritings()
      .then((data) => setWritings(data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Error al cargar"))
      .finally(() => setLoading(false));
  }

  const filtered = writings.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.category.toLowerCase().includes(search.toLowerCase()),
  );

  function handleSave(writing: Writing) {
    startTransition(async () => {
      try {
        if (editing) {
          await updateWriting(writing.id, {
            name: writing.name,
            category: writing.category,
            stage: writing.stage,
            content: writing.content,
            enabled: writing.enabled,
          });
          toast.success("Escrito actualizado");
        } else {
          await createWriting({
            name: writing.name,
            category: writing.category,
            stage: writing.stage,
            content: writing.content,
            enabled: true,
          });
          toast.success("Escrito creado");
        }
        setEditing(null);
        setCreating(false);
        loadWritings();
      } catch (err) {
        toast.error("Error", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Eliminar este escrito?")) return;
    startTransition(async () => {
      try {
        await deleteWriting(id);
        toast.success("Escrito eliminado");
        loadWritings();
      } catch (err) {
        toast.error("Error", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Biblioteca de escritos
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Escritos pre-cargados disponibles para todos los casos del estudio
          </p>
        </div>
<div className="flex gap-2">
  <Button
    variant="outline"
    onClick={() => {
      startTransition(async () => {
        try {
          const result = await syncWritingsFromFolder();
          toast.success(`Sincronizado: ${result.created} nuevos, ${result.updated} actualizados`);
          if (result.errors.length > 0) {
            toast.error(`${result.errors.length} archivos con error`, {
              description: result.errors.join("\n"),
            });
          }
          loadWritings();
        } catch (err) {
          toast.error("Error", { description: err instanceof Error ? err.message : "" });
        }
      });
    }}
    disabled={isPending}
  >
    {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
    Sincronizar carpeta
  </Button>
  <Button onClick={() => setCreating(true)} className="gap-1.5">
    <Plus className="h-3.5 w-3.5" />
    Nuevo escrito
  </Button>
</div>
      </header>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.8}
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar escrito por nombre o categoria"
          className="h-9 pl-9"
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-normal">Nombre</th>
              <th className="px-4 py-2 text-left font-normal">Categoria</th>
              <th className="px-4 py-2 text-left font-normal">Etapa</th>
              <th className="px-4 py-2 text-right font-normal">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  No hay escritos cargados
                </td>
              </tr>
            ) : (
              filtered.map((w) => (
                <tr key={w.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{w.name}</div>
                  </td>
                  <td className="px-4 py-2.5 text-xs">{CATEGORY_LABELS[w.category] ?? w.category}</td>
                  <td className="px-4 py-2.5 text-xs">{STAGE_LABELS[w.stage] ?? w.stage}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setEditing(w)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-popover hover:text-primary"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(w.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-popover hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(creating || editing) && (
        <WritingDialog
          writing={editing}
          isPending={isPending}
          onSave={handleSave}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function WritingDialog({
  writing,
  isPending,
  onSave,
  onClose,
}: {
  writing: Writing | null;
  isPending: boolean;
  onSave: (writing: Writing) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(writing?.name ?? "");
  const [category, setCategory] = useState(writing?.category ?? "OTRO");
  const [stage, setStage] = useState(writing?.stage ?? "TODAS");
  const [content, setContent] = useState(writing?.content ?? "");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{writing ? "Editar escrito" : "Nuevo escrito"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre del escrito</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Categoria</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {WRITING_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Etapa procesal</Label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {WRITING_STAGES.map((s) => (
                  <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Contenido base</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              placeholder="Escriba el contenido del escrito. Use {{cliente_nombre}}, {{demandado_nombre}}, {{juzgado}}, etc."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => onSave({ id: writing?.id ?? "", name, category, stage, content, enabled: true })}
            disabled={!name.trim() || isPending}
          >
            {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}