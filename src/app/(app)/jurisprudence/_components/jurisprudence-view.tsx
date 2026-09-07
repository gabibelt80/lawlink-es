"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Scale,
  Plus,
  Trash2,
  Loader2,
  Search,
  Calendar,
  Landmark,
  FileText,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";
import { createJurisprudence, deleteJurisprudence } from "@/server/jurisprudence/actions";

type JurisprudenceItem = {
  id: string;
  title: string;
  summary: string | null;
  fullText: string;
  court: string | null;
  jurisdiction: string | null;
  date: Date | null;
  source: string | null;
  category: string | null;
  tags: string[];
  createdAt: Date;
};

export function JurisprudenceView({ items }: { items: JurisprudenceItem[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.summary?.toLowerCase().includes(search.toLowerCase()) ||
      item.fullText.toLowerCase().includes(search.toLowerCase()) ||
      item.court?.toLowerCase().includes(search.toLowerCase())
  );

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createJurisprudence({
          title: formData.get("title") as string,
          summary: (formData.get("summary") as string) || undefined,
          fullText: formData.get("fullText") as string,
          court: (formData.get("court") as string) || undefined,
          jurisdiction: (formData.get("jurisdiction") as string) || undefined,
          date: (formData.get("date") as string) || undefined,
          source: (formData.get("source") as string) || undefined,
          category: (formData.get("category") as string) || undefined,
          tags: [],
        });
        toast.success("Jurisprudencia guardada");
        setCreateOpen(false);
        router.refresh();
      } catch (err) {
        toast.error("Error al guardar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  function handleDelete(id: string, title: string) {
    if (!confirm(`¿Eliminar "${title}"?`)) return;
    startTransition(async () => {
      try {
        await deleteJurisprudence(id);
        toast.success("Jurisprudencia eliminada");
        router.refresh();
      } catch (err) {
        toast.error("Error al eliminar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  return (
    <div className="space-y-6 px-6 py-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Jurisprudencia
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Base de fallos y sentencias guardadas
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Nueva jurisprudencia
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título, tribunal, texto..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Scale className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No hay jurisprudencia guardada
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium leading-snug">{item.title}</h3>
                  {item.summary && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {item.summary}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    {item.court && (
                      <span className="inline-flex items-center gap-1">
                        <Landmark className="h-3 w-3" />
                        {item.court}
                      </span>
                    )}
                    {item.jurisdiction && (
                      <span className="inline-flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {item.jurisdiction}
                      </span>
                    )}
                    {item.date && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(item.date).toLocaleDateString("es-AR")}
                      </span>
                    )}
                    {item.category && (
                      <Badge variant="outline" className="text-[10px]">
                        {item.category}
                      </Badge>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(item.id, item.title)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-popover hover:text-destructive shrink-0"
                  title="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-primary hover:underline">
                  <FileText className="inline h-3 w-3 mr-1" />
                  Ver texto completo
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-foreground/80 bg-muted/30 rounded-md p-4">
                  {item.fullText}
                </pre>
              </details>
              {item.source && (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Fuente: {item.source}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva jurisprudencia</DialogTitle>
            <DialogDescription>
              Cargá la sentencia o fallo con todos sus detalles
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <Label className="text-xs">Título *</Label>
              <Input name="title" required placeholder="Ej.: Daños y perjuicios por mala praxis" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Resumen</Label>
              <Textarea name="summary" rows={2} placeholder="Breve resumen del fallo" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Texto completo *</Label>
              <Textarea name="fullText" rows={8} required placeholder="Texto completo del fallo" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tribunal</Label>
                <Input name="court" placeholder="Ej.: Cámara Civil Sala E" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Jurisdicción</Label>
                <Input name="jurisdiction" placeholder="Ej.: CABA, Buenos Aires" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Fecha</Label>
                <Input name="date" type="date" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Categoría</Label>
                <Input name="category" placeholder="Ej.: Civil, Penal, Laboral" className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Fuente</Label>
              <Input name="source" placeholder="Ej.: elDial, La Ley, CSJN" className="mt-1" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="gap-1.5">
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}