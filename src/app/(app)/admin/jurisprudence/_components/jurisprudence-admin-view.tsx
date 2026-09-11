"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Upload,
  Download,
  Loader2,
  FileJson,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  importJurisprudenceBatch,
  exportJurisprudence,
} from "@/server/jurisprudence/actions";

export function JurisprudenceAdminView() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<unknown[] | null>(null);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.endsWith(".json")) {
      toast.error("Solo se admiten archivos .json");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!Array.isArray(parsed)) {
          toast.error("El JSON debe ser un array");
          return;
        }
        setPreview(parsed);
      } catch {
        toast.error("El archivo no es un JSON válido");
      }
    };
    reader.readAsText(file);
  }

  function handleImport() {
    if (!preview || preview.length === 0) return;
    startTransition(async () => {
      try {
        const res = await importJurisprudenceBatch(preview as never);
        toast.success(`Se importaron ${res.count} fallos`);
        setPreview(null);
        setFileName("");
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } catch (err) {
        toast.error("Error al importar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  function handleExport() {
    startTransition(async () => {
      try {
        const items = await exportJurisprudence();
        const blob = new Blob([JSON.stringify(items, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `jurisprudencia-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Se exportaron ${items.length} fallos`);
      } catch (err) {
        toast.error("Error al exportar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  function handleReset() {
    setPreview(null);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl flex items-center gap-2">
          <FileJson className="h-5 w-5 text-primary" />
          Importar / Exportar jurisprudencia
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Importá fallos desde un archivo JSON o exportá la base actual
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-medium">Importar desde JSON</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          El archivo debe ser un array de objetos. Campos admitidos: title,
          summary, fullText, court, jurisdiction, fuero, date, source,
          sourceUrl, category, tags.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            className="gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            Seleccionar archivo JSON
          </Button>
          {fileName && (
            <span className="text-xs text-muted-foreground">{fileName}</span>
          )}
        </div>

        {preview && preview.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Se detectaron {preview.length} fallos para importar
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                disabled={isPending}
                className="gap-1.5"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar importación
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isPending}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {preview && preview.length === 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
            <AlertCircle className="h-3.5 w-3.5" />
            El archivo no contiene fallos
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-medium">Exportar base actual</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Descargá toda la jurisprudencia como JSON
        </p>
        <Button onClick={handleExport} disabled={isPending} className="gap-1.5">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Exportar JSON
        </Button>
      </section>
    </div>
  );
}