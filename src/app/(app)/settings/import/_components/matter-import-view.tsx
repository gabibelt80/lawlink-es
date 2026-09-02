"use client";

import { useRef, useState, useTransition } from "react";
import { Download, Upload, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  parseMatterImportAction,
  commitMatterImportAction,
  type ImportPreview,
  type ImportResult
} from "@/server/imports/actions";

export function MatterImportView() {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [parsing, startParse] = useTransition();
  const [importing, startImport] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    startParse(async () => {
      try {
        const p = await parseMatterImportAction(fd);
        setPreview(p);
      } catch (e) {
        setPreview(null);
        toast.error(e instanceof Error ? e.message : "Error al analizar");
      }
    });
  };

  const doImport = () => {
    if (!preview) return;
    const valid = preview.rows.filter((r) => r.valid).map((r) => ({ rowNo: r.rowNo, raw: r.raw }));
    if (valid.length === 0) {
      toast.error("No hay filas válidas para importar");
      return;
    }
    startImport(async () => {
      try {
        const res = await commitMatterImportAction({ rows: valid });
        setResult(res);
        setPreview(null);
        if (fileRef.current) fileRef.current.value = "";
        toast.success(`Importación completada: ${res.succeeded.length} exitosas, ${res.failed.length} con error`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al importar");
      }
    });
  };

  const reset = () => {
    setPreview(null);
    setResult(null);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-5">
      <section className="ll-surface rounded-lg border border-border p-5">
        <header className="mb-3 flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          <h2 className="text-lg">Importación masiva de casos</h2>
        </header>
        <p className="mb-4 text-[12px] text-muted-foreground">
          Descargá la plantilla Excel, completala y subila → previsualizá y validá (las filas con error se marcan en rojo, solo se importan las filas sin error) → Confirmá la importación.
          Cada fila creará el Cliente (con control de duplicados por nombre + número de documento), el Caso (numeración automática + número interno del estudio + titular), las Partes (con control de conflicto de intereses),
          y los casos «En trámite» generarán automáticamente el primer procedimiento según el tipo.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <a href="/api/imports/matters/template" download>
            <Button variant="outline" className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Descargar plantilla
            </Button>
          </a>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={parsing} className="gap-1.5">
            {parsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Subir y previsualizar
          </Button>
          {fileName && <span className="text-[12px] text-muted-foreground">{fileName}</span>}
        </div>
      </section>

      {/* —— Vista previa —— */}
      {preview && (
        <section className="ll-surface rounded-lg border border-border p-5">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="text-[14px] font-medium">
              Vista previa
              <span className="ml-2 text-[12px] font-normal text-muted-foreground">
                Total {preview.total} filas · Importables{" "}
                <span className="text-emerald-700">{preview.validCount}</span> · Con error{" "}
                <span className={preview.total - preview.validCount > 0 ? "text-destructive" : ""}>
                  {preview.total - preview.validCount}
                </span>
              </span>
            </h3>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={reset}>
                Cancelar
              </Button>
              <Button size="sm" onClick={doImport} disabled={importing || preview.validCount === 0} className="gap-1.5">
                {importing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirmar importación de {preview.validCount} filas
              </Button>
            </div>
          </header>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="whitespace-nowrap px-2 py-1.5 font-medium">Fila</th>
                  <th className="whitespace-nowrap px-2 py-1.5 font-medium">Validación</th>
                  {preview.columns.map((c) => (
                    <th key={c.key} className="whitespace-nowrap px-2 py-1.5 font-medium">
                      {c.header}
                      {c.required && <span className="text-destructive">*</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr
                    key={r.rowNo}
                    className={r.valid ? "border-b border-border" : "border-b border-border bg-destructive/5"}
                  >
                    <td className="px-2 py-1.5 font-mono text-muted-foreground">{r.rowNo}</td>
                    <td className="px-2 py-1.5">
                      {r.valid ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-destructive"
                          title={r.errors.join("; ")}
                        >
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span className="max-w-[220px] truncate">{r.errors.join("; ")}</span>
                        </span>
                      )}
                    </td>
                    {preview.columns.map((c) => (
                      <td key={c.key} className="whitespace-nowrap px-2 py-1.5">
                        {r.raw[c.key] || <span className="text-muted-foreground/40">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* —— Resultado —— */}
      {result && (
        <section className="ll-surface rounded-lg border border-border p-5">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="text-[14px] font-medium">
              Resultado de importación · Exitosas <span className="text-emerald-700">{result.succeeded.length}</span> · Con error{" "}
              <span className={result.failed.length > 0 ? "text-destructive" : ""}>{result.failed.length}</span>
            </h3>
            <Button variant="ghost" size="sm" onClick={reset}>
              Importar otro lote
            </Button>
          </header>

          {result.succeeded.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-[12px] text-muted-foreground">Creados con éxito:</p>
              <ul className="space-y-0.5 text-[12px]">
                {result.succeeded.map((s) => (
                  <li key={s.rowNo} className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
                      <span className="font-mono text-muted-foreground">Fila {s.rowNo}</span>
                      <span className="font-mono">{s.internalCode}</span>
                      {s.firmCaseNo && <span className="font-mono text-muted-foreground">{s.firmCaseNo}</span>}
                      <span className="truncate">{s.title}</span>
                    </div>
                    {s.causeDowngradeReason && (
                      <div className="ml-5 flex items-start gap-1.5 text-[11px] text-amber-600">
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>
                          La causa se degradó a texto libre ({s.causeDowngradeReason}); el caso se importó, verificá la causa manualmente después
                        </span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.failed.length > 0 && (
            <div>
              <p className="mb-1 text-[12px] text-destructive">Filas con error:</p>
              <ul className="space-y-0.5 text-[12px]">
                {result.failed.map((f) => (
                  <li key={f.rowNo} className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span className="font-mono">Fila {f.rowNo}</span>
                    <span>{f.error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}