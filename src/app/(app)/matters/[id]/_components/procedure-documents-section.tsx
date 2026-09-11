"use client";

/**
 * v0.27: Sección "Materiales del Caso" bajo el procedimiento
 * v0.42: Tabs de categoría + parte de origen + vista previa docx/xlsx
 *
 * - Cada procedimiento muestra sus propios Document asociados
 * - Al subir es obligatorio elegir categoría; en escritos/pruebas se puede indicar la parte de origen (tomada de las partes del caso)
 * - Vista previa: pdf/imagen/texto van por download?inline=1; docx/xlsx van por /preview convirtiendo a HTML
 */
import { useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  Loader2,
  Plus,
  Trash2,
  Download,
  Eye
} from "lucide-react";
import type { DocumentCategory, LitigationStanding } from "@prisma/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { uploadDocument, deleteDocument } from "@/server/documents/actions";
import { canPreview, officePreviewKind } from "@/lib/storage/mime-ext";
import { cn, formatDate } from "@/lib/utils";
import { litigationStandingLabel } from "@/lib/enums";

// v0.42: etiquetas de categoría renombradas según la costumbre del abogado
const categoryLabel: Record<DocumentCategory, string> = {
  PLEADING: "Escritos",
  EVIDENCE: "Pruebas",
  PROCEDURE: "Documentos del procedimiento",
  JUDGMENT: "Resoluciones",
  CONTRACT: "Otros",
  OTHER: "Otros"
};
const CATEGORY_OPTIONS: DocumentCategory[] = [
  "PLEADING",
  "EVIDENCE",
  "PROCEDURE",
  "JUDGMENT",
  "OTHER"
];
// Categorías que requieren indicar la parte de origen (escritos / pruebas)
const SOURCE_CATEGORIES: DocumentCategory[] = ["PLEADING", "EVIDENCE"];
const COURT_PROCEDURE_SOURCE = "Documentos del tribunal";

type ProcedureParty = {
  id: string;
  standing: LitigationStanding;
  ordinal: number;
  party: { id: string; name: string };
};

type DocItem = {
  id: string;
  name: string;
  category: DocumentCategory;
  mimeType: string | null;
  size: number | null;
  createdAt: Date;
  sourceParty: string | null;
  path: string;
};

function iconFor(d: Pick<DocItem, "mimeType" | "name">) {
  const mime = d.mimeType?.toLowerCase() ?? "";
  const ext = d.name.split(".").pop()?.toLowerCase() ?? "";

  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "heic"].includes(ext)) {
    return { src: "/file-icons/image.svg", alt: "Archivo de imagen" };
  }
  if (mime.includes("pdf") || ext === "pdf") {
    return { src: "/file-icons/pdf.svg", alt: "Archivo PDF" };
  }
  if (
    mime.includes("word") ||
    mime.includes("msword") ||
    ["doc", "docx"].includes(ext)
  ) {
    return { src: "/file-icons/word.svg", alt: "Archivo Word" };
  }
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    ["xls", "xlsx", "csv"].includes(ext)
  ) {
    return { src: "/file-icons/excel.svg", alt: "Archivo Excel" };
  }
  if (
    mime.includes("presentation") ||
    mime.includes("powerpoint") ||
    ["ppt", "pptx"].includes(ext)
  ) {
    return { src: "/file-icons/presentation.svg", alt: "Presentación" };
  }
  if (mime.includes("json") || ext === "json") {
    return { src: "/file-icons/json.svg", alt: "Archivo JSON" };
  }
  if (
    mime.includes("xml") ||
    ["xml", "html", "htm", "css", "js", "jsx", "ts", "tsx", "java", "py", "go", "rb", "php", "sh", "yml", "yaml"].includes(ext)
  ) {
    return { src: "/file-icons/code.svg", alt: "Archivo de código" };
  }
  if (
    mime.startsWith("text/") ||
    ["txt", "md", "rtf", "log"].includes(ext)
  ) {
    return { src: "/file-icons/text.svg", alt: "Archivo de texto" };
  }
  if (
    mime.includes("zip") ||
    mime.includes("rar") ||
    ["zip", "rar", "7z", "tar", "gz"].includes(ext)
  ) {
    return { src: "/file-icons/archive.svg", alt: "Archivo comprimido" };
  }
  if (mime.startsWith("audio/") || ["mp3", "wav", "m4a", "aac"].includes(ext)) {
    return { src: "/file-icons/audio.svg", alt: "Archivo de audio" };
  }
  if (mime.startsWith("video/") || ["mp4", "mov", "avi", "mkv"].includes(ext)) {
    return { src: "/file-icons/video.svg", alt: "Archivo de video" };
  }
  return { src: "/file-icons/generic.svg", alt: "Archivo" };
}

// URL de vista previa: documentos office se convierten a HTML, el resto va inline
function previewUrl(d: DocItem): string | null {
  if (officePreviewKind(d.mimeType, d.name)) {
    return `/api/documents/${d.id}/preview`;
  }
  if (canPreview(d.mimeType, d.name)) {
    return `/api/documents/${d.id}/download?inline=1`;
  }
  return null;
}

export function ProcedureDocumentsSection({
  matterId,
  procedureId,
  documents,
  procedureParties,
  canManage
}: {
  matterId: string;
  procedureId: string;
  documents: DocItem[];
  procedureParties: ProcedureParty[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>("PLEADING");
  const [sourceParty, setSourceParty] = useState<string>("");
  const [customName, setCustomName] = useState("");
  const [isPending, startTransition] = useTransition();
  // Filtro de categoría actual (Ver todos = null)
  const [filter, setFilter] = useState<DocumentCategory | null>(null);

  // Opciones de origen/parte: partes del procedimiento actual (posición procesal + Nombre)
  const sourceOptions = useMemo(
    () => {
      const seen = new Set<string>([COURT_PROCEDURE_SOURCE]);
      const partyOptions = [...procedureParties]
        .sort((a, b) => a.ordinal - b.ordinal || a.party.name.localeCompare(b.party.name, "es-AR"))
        .map((row) => {
          const name = row.party.name.trim();
          if (!name) return null;
          return `${litigationStandingLabel[row.standing] ?? row.standing}·${name}`;
        })
        .filter((label): label is string => {
          if (!label || seen.has(label)) return false;
          seen.add(label);
          return true;
        });
      return [COURT_PROCEDURE_SOURCE, ...partyOptions];
    },
    [procedureParties]
  );

  const filtered = useMemo(
    () => (filter ? documents.filter((d) => d.category === filter) : documents),
    [documents, filter]
  );

  function handleSubmit() {
    if (!picked) {
      toast.error("Primero seleccioná un archivo");
      return;
    }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("matterId", matterId);
        fd.set("procedureId", procedureId);
        fd.set("file", picked);
        fd.set("category", category);
        if (SOURCE_CATEGORIES.includes(category) && sourceParty) {
          fd.set("sourceParty", sourceParty);
        }
        fd.set("name", customName.trim() || picked.name);
        await uploadDocument(fd);
        toast.success("Subida exitosa");
        setOpen(false);
        setPicked(null);
        setCustomName("");
        setSourceParty("");
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } catch (err) {
        toast.error("Error al subir", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar el material "${name}"?`)) return;
    startTransition(async () => {
      try {
        await deleteDocument(id);
        toast.success("Eliminado");
        router.refresh();
      } catch (err) {
        toast.error("Error al eliminar", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap">
            Materiales del Caso
            <span className="ml-1 font-mono text-[11px] text-muted-foreground tabular">
              {documents.length}
            </span>
          </span>
          {/* Grupo de botones de categoría (referencia: Aprobación) */}
          <div className="flex min-w-0 max-w-full items-center gap-0.5 overflow-x-auto rounded-md border border-border bg-background p-0.5">
            <button
              type="button"
              onClick={() => setFilter(null)}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] transition-colors",
                filter === null
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Ver todos
            </button>
            {CATEGORY_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFilter(filter === c ? null : c)}
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] transition-colors",
                  filter === c
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {categoryLabel[c]}
              </button>
            ))}
          </div>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setOpen(true)} className="h-6 gap-0.5 px-2 text-[11px] shrink-0">
            <Plus className="h-2.5 w-2.5" />
            Subir
          </Button>
        )}
      </header>

      {filtered.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-muted-foreground">
          {filter ? "No hay materiales en esta categoría" : "Este procedimiento todavía no tiene materiales"}
        </p>
      ) : (
        // Lista de archivos, sin borde externo
        <ul className="divide-y divide-border px-4">
          {filtered.map((d) => {
            const icon = iconFor(d);
            const pUrl = previewUrl(d);
            return (
              <li
                key={d.id}
                className="group flex items-center gap-2 py-2"
              >
                <Image src={icon.src} alt={icon.alt} width={20} height={20} className="h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  {pUrl ? (
                    <a
                      href={pUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-xs hover:text-primary hover:underline"
                      title="Clic para abrir y ver"
                    >
                      {d.name}
                    </a>
                  ) : (
                    <span className="truncate text-xs" title={d.name}>
                      {d.name}
                    </span>
                  )}
                  <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {formatDate(d.createdAt)}
                    {d.size ? ` · ${(d.size / 1024).toFixed(0)}KB` : ""}
                    {d.sourceParty ? ` · ${d.sourceParty}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {pUrl && (
                    <a
                      href={pUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-muted-foreground hover:text-primary"
                      title="Vista previa"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <a
                    href={`/api/documents/${d.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-muted-foreground hover:text-primary"
                    title="Descargar"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDelete(d.id, d.name)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canManage && (
        <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Subir material del Caso</DialogTitle>
            <DialogDescription className="text-xs">
              Archivo ≤ 20MB · Se asocia automáticamente al procedimiento actual
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Categoría del material *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryLabel[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* v0.42 Origen/parte: solo para escritos/pruebas; opciones = partes del procedimiento actual */}
            {SOURCE_CATEGORIES.includes(category) && sourceOptions.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Origen/parte (opcional)</Label>
                <Select
                  value={sourceParty || "__none__"}
                  onValueChange={(v) => setSourceParty(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder="Elegir origen/parte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin indicar</SelectItem>
                    {sourceOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Archivo *</Label>
              <Input
                ref={fileRef}
                type="file"
                onChange={(e) => setPicked(e.target.files?.[0] ?? null)}
              />
              {picked && (
                <p className="text-[10px] text-muted-foreground">
                  Seleccionado {picked.name}（{(picked.size / 1024).toFixed(0)} KB）
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Nombre a mostrar (opcional, si se deja vacío usa el nombre del archivo)</Label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Ej: demanda del actor - versión final"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !picked}>
              {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Subir
            </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>
      )}
    </section>
  );
}