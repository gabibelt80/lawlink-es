"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { FileText, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { WritingEditor } from "./writing-editor";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { listWritings } from "@/server/writings/actions";

type Writing = {
  id: string;
  name: string;
  category: string;
  stage: string;
  content: string;
  enabled: boolean;
};

export function WritingPickerDialog({
  open,
  onOpenChange,
  matterId,
  procedureId,
  stageId,
  stageName,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  matterId: string;
  procedureId: string;
  stageId: string;
  stageName: string;
  onSaved?: () => void;
}) {
  const [writings, setWritings] = useState<Writing[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editingWriting, setEditingWriting] = useState<Writing | null>(null);

useEffect(() => {
  if (open) {
    setLoading(true);
    listWritings()
      .then((data) => setWritings(data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Error al cargar"))
      .finally(() => setLoading(false));
  }
}, [open]);

  const filtered = useMemo(
    () =>
      writings.filter(
        (w) =>
          w.name.toLowerCase().includes(search.toLowerCase()) ||
          w.category.toLowerCase().includes(search.toLowerCase())
      ),
    [writings, search]
  );

function handleSelect(writing: Writing) {
  setEditingWriting(writing);
  onOpenChange(false);
}
  function handleSave() {
    if (!selectedId || !name.trim() || !content.trim()) {
      toast.warning("Seleccione un escrito y complete el contenido");
      return;
    }
    startTransition(async () => {
      try {
        const { saveWritingToMatter } = await import("@/server/writings/actions");
        await saveWritingToMatter({
          matterId,
          procedureId,
          stageId,
          stageName,
          name,
          content,
          writingTemplateId: selectedId,
        });
        toast.success("Escrito guardado en el expediente");
        setSelectedId(null);
        setName("");
        setContent("");
        onOpenChange(false);
        onSaved?.();
      } catch (err) {
        toast.error("Error al guardar", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

 return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[92vh] w-[95vw] max-w-[95vw] flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>Biblioteca de escritos</DialogTitle>
        </DialogHeader>

        <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-[280px_1fr]">
          {/* Lista de escritos */}
          <div className="flex max-h-[60vh] flex-col border-b border-border md:border-b-0 md:border-r">
            <div className="border-b border-border p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar escrito..."
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No hay escritos cargados
                </p>
              ) : (
                <div className="space-y-0.5">
                  {filtered.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => handleSelect(w)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors",
                        selectedId === w.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted/60"
                      )}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{w.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Editor del escrito seleccionado - vista hoja A4 */}
          <div className="flex max-h-[60vh] flex-col overflow-y-auto bg-[#525659] p-4">
            {selectedId ? (
              <div className="mx-auto w-full max-w-[210mm]">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-8 bg-white text-xs font-medium"
                  />
                </div>
                <div className="min-h-[297mm] rounded-sm bg-white shadow-lg">
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[297mm] w-full resize-none border-0 bg-transparent p-[20mm] text-[12pt] leading-[1.6] text-black focus-visible:ring-0 focus-visible:ring-offset-0"
                    style={{
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      lineHeight: "1.6",
                    }}
                  />
                </div>
                <p className="mt-2 text-[10.5px] text-gray-400">
                  Use variables como {"{{cliente_nombre}}"}, {"{{demandado_nombre}}"}, {"{{juzgado}}"}, etc.
                </p>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                  <FileText className="mx-auto h-10 w-10 text-gray-500" />
                  <p className="mt-2 text-xs text-gray-400">
                    Seleccione un escrito de la biblioteca para editar
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border px-5 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!selectedId || isPending} className="gap-1.5">
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Guardar en el expediente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      {editingWriting && (
        <WritingEditor
          open={true}
          onClose={() => setEditingWriting(null)}
          title={editingWriting.name}
          content={editingWriting.content}
          onSave={(title, content) => {
            startTransition(async () => {
              try {
                const { saveWritingToMatter } = await import("@/server/writings/actions");
                await saveWritingToMatter({
                  matterId,
                  procedureId,
                  stageId,
                  stageName,
                  name: title,
                  content,
                  writingTemplateId: editingWriting.id,
                });
                toast.success("Escrito guardado en el expediente");
                setEditingWriting(null);
                onSaved?.();
              } catch (err) {
                toast.error("Error al guardar", { description: err instanceof Error ? err.message : "" });
              }
            });
          }}
          isPending={isPending}
        />
      )}
    </>
  );
}