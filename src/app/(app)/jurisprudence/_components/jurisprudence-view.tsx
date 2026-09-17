"use client";

import { useState, useTransition, useEffect, useRef } from "react";
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
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createJurisprudence,
  deleteJurisprudence,
  searchJurisprudence,
  type SearchJurisprudenceResult,
} from "@/server/jurisprudence/actions";

type JurisprudenceItem = SearchJurisprudenceResult["items"][number];

export function JurisprudenceView({
  initialData,
  isSystemAdmin = false,
}: {
  initialData: SearchJurisprudenceResult;
  isSystemAdmin?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [data, setData] = useState<SearchJurisprudenceResult>(initialData);
  const [searchInput, setSearchInput] = useState("");
  const [fuero, setFuero] = useState<string>("__all__");
  const [year, setYear] = useState<string>("__all__");
  const [jurisdiction, setJurisdiction] = useState<string>("__all__");
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<JurisprudenceItem | null>(null);
  const [fullDetail, setFullDetail] = useState<{
    fullText: string;
    descriptors: unknown;
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [fueros, setFueros] = useState<string[]>([]);
  const [jurisdictions, setJurisdictions] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);

  const searchTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { getJurisprudenceFilterOptionsNew } = await import(
          "@/server/jurisprudence/actions"
        );
        const opts = await getJurisprudenceFilterOptionsNew();
        setFueros(opts.fueros);
        setJurisdictions(opts.jurisdictions);
        setYears(opts.years);
      } catch {
        // silencioso
      }
    })();
  }, []);

  async function runSearch(
    q: string,
    f: string,
    j: string,
    y: string,
    p: number
  ) {
    startTransition(async () => {
      try {
        const result = await searchJurisprudence({
          query: q || undefined,
          fuero: f !== "__all__" ? f : undefined,
          jurisdiction: j !== "__all__" ? j : undefined,
          yearFrom: y !== "__all__" ? parseInt(y, 10) : undefined,
          yearTo: y !== "__all__" ? parseInt(y, 10) : undefined,
          page: p,
          pageSize: 20,
        });
        setData(result);
      } catch (err) {
        toast.error("Error en la busqueda", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      runSearch(value, fuero, jurisdiction, year, 1);
    }, 400);
  }

  function handleFilterChange(
    tipo: "fuero" | "year" | "jurisdiction",
    value: string
  ) {
    if (tipo === "fuero") setFuero(value);
    if (tipo === "year") setYear(value);
    if (tipo === "jurisdiction") setJurisdiction(value);
    setPage(1);

    runSearch(
      searchInput,
      tipo === "fuero" ? value : fuero,
      tipo === "jurisdiction" ? value : jurisdiction,
      tipo === "year" ? value : year,
      1
    );
  }

  function handlePageChange(newPage: number) {
    if (newPage < 1 || newPage > data.totalPages) return;
    setPage(newPage);
    runSearch(searchInput, fuero, jurisdiction, year, newPage);
  }

  function clearFilters() {
    setSearchInput("");
    setFuero("__all__");
    setYear("__all__");
    setJurisdiction("__all__");
    setPage(1);
    runSearch("", "__all__", "__all__", "__all__", 1);
  }

  const hasFilters =
    searchInput.length > 0 ||
    fuero !== "__all__" ||
    year !== "__all__" ||
    jurisdiction !== "__all__";

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
        runSearch("", "__all__", "__all__", "__all__", 1);
      } catch (err) {
        toast.error("Error al guardar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  function handleDelete(id: string, title: string) {
    if (!confirm(`Eliminar "${title}"?`)) return;
    startTransition(async () => {
      try {
        await deleteJurisprudence(id);
        toast.success("Jurisprudencia eliminada");
        setSelected(null);
        runSearch(searchInput, fuero, jurisdiction, year, page);
      } catch (err) {
        toast.error("Error al eliminar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  async function openDetail(item: JurisprudenceItem) {
    setSelected(item);
    setFullDetail(null);
    setLoadingDetail(true);
    try {
      const { getJurisprudenceById } = await import(
        "@/server/jurisprudence/actions"
      );
      const full = await getJurisprudenceById(item.id);
      setFullDetail({
        fullText: full.fullText,
        descriptors: full.descriptors,
      });
    } catch {
      toast.error("Error cargando detalle");
    } finally {
      setLoadingDetail(false);
    }
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
            {data.total.toLocaleString("es-AR")} fallos en la biblioteca del
            estudio
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva jurisprudencia
        </Button>
      </header>

      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">Material de referencia</p>
          <p className="mt-0.5 text-amber-700 dark:text-amber-300">
            Este material es solo a modo de referencia y no constituye
            asesoramiento legal. Verificá siempre el fallo original en la fuente
            oficial antes de citarlo.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar en titulo, sumario y texto completo..."
            className="pl-9"
          />
          {isPending && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Select
            value={fuero}
            onValueChange={(v) => handleFilterChange("fuero", v)}
          >
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="Fuero" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los fueros</SelectItem>
              {fueros.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={jurisdiction}
            onValueChange={(v) => handleFilterChange("jurisdiction", v)}
          >
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="Jurisdiccion" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas las jurisdicciones</SelectItem>
              {jurisdictions.map((j) => (
                <SelectItem key={j} value={j}>
                  {j}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={year}
            onValueChange={(v) => handleFilterChange("year", v)}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los años</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={clearFilters}
              className="h-8 gap-1.5 text-xs"
            >
              <X className="h-3 w-3" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Lista */}
      {data.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Scale className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            {hasFilters
              ? "No hay fallos que coincidan con tu busqueda"
              : "No hay jurisprudencia guardada"}
          </p>
          {hasFilters && (
            <Button
              size="sm"
              variant="outline"
              onClick={clearFilters}
              className="mt-3"
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium leading-snug">
                    {item.title}
                  </h3>
                  {item.summary && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {item.summary}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    {item.fuero && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-primary/30 text-primary"
                      >
                        {item.fuero}
                      </Badge>
                    )}
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
                    {item.numeroSumario && (
                      <span className="font-mono text-[10px]">
                        {item.numeroSumario}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDetail(item)}
                    className="gap-1.5 text-xs"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Ver
                  </Button>
                  {isSystemAdmin && (
                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-popover hover:text-destructive"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginacion */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-xs text-muted-foreground">
            Mostrando {(data.page - 1) * data.pageSize + 1}-
            {Math.min(data.page * data.pageSize, data.total)} de{" "}
            {data.total.toLocaleString("es-AR")}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={data.page === 1 || isPending}
              onClick={() => handlePageChange(data.page - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground">
              Pagina {data.page} de {data.totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={data.page === data.totalPages || isPending}
              onClick={() => handlePageChange(data.page + 1)}
            >
              Siguiente
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal detalle */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base leading-snug">
                  {selected.title}
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
                  {selected.fuero && (
                    <Badge variant="outline" className="text-[10px]">
                      {selected.fuero}
                    </Badge>
                  )}
                  {selected.court && (
                    <span className="inline-flex items-center gap-1">
                      <Landmark className="h-3 w-3" />
                      {selected.court}
                    </span>
                  )}
                  {selected.jurisdiction && (
                    <span className="inline-flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {selected.jurisdiction}
                    </span>
                  )}
                  {selected.date && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(selected.date).toLocaleDateString("es-AR")}
                    </span>
                  )}
                  {selected.numeroSumario && (
                    <span className="font-mono text-[10px]">
                      Sumario {selected.numeroSumario}
                    </span>
                  )}
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {selected.summary && (
                  <div>
                    <h4 className="mb-1 text-xs font-medium text-muted-foreground">
                      Resumen
                    </h4>
                    <p className="text-sm leading-relaxed">{selected.summary}</p>
                  </div>
                )}

                <div>
                  <h4 className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    Texto completo
                  </h4>
                  {loadingDetail ? (
                    <div className="flex items-center gap-2 rounded-md bg-muted/30 p-4 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Cargando texto completo...
                    </div>
                  ) : fullDetail?.fullText ? (
                    <pre className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/80 bg-muted/30 rounded-md p-4 max-h-[400px] overflow-y-auto">
                      {fullDetail.fullText}
                    </pre>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No se pudo cargar el texto completo.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <div className="text-[10px] text-muted-foreground">
                    Fuente: {selected.source || "Desconocida"}
                  </div>
                  <div className="flex items-center gap-2">
                    {selected.sourceUrl && (
                      <a
                        href={selected.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Abrir en SAIJ
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {isSystemAdmin && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          handleDelete(selected.id, selected.title)
                        }
                        className="gap-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>

                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
                  Si el enlace a SAIJ no funciona, busca el fallo manualmente en
                  saij.gob.ar usando el numero de sumario.
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal crear */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva jurisprudencia</DialogTitle>
            <DialogDescription>
              Carga la sentencia o fallo con todos sus detalles
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <Label className="text-xs">Titulo *</Label>
              <Input
                name="title"
                required
                placeholder="Ej.: Danos y perjuicios por mala praxis"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Resumen</Label>
              <Textarea
                name="summary"
                rows={2}
                placeholder="Breve resumen del fallo"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Texto completo *</Label>
              <Textarea
                name="fullText"
                rows={8}
                required
                placeholder="Texto completo del fallo"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tribunal</Label>
                <Input
                  name="court"
                  placeholder="Ej.: Camara Civil Sala E"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Jurisdiccion</Label>
                <Input
                  name="jurisdiction"
                  placeholder="Ej.: CABA, Buenos Aires"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Fecha</Label>
                <Input name="date" type="date" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Categoria</Label>
                <Input
                  name="category"
                  placeholder="Ej.: Civil, Penal, Laboral"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Fuente</Label>
              <Input
                name="source"
                placeholder="Ej.: elDial, La Ley, CSJN"
                className="mt-1"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={isPending}
              >
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