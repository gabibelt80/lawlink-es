"use client";

import { useState, useMemo, useTransition } from "react";
import { Sparkles, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { renderTemplate } from "@/server/document-templates/actions";
import {
  type TemplateSummary,
  type FolderPayload,
  TEMPLATE_CATEGORY_CN,
  VARIABLE_LABEL_CN
} from "./folder-types";

function describeMissing(paths: string[]): string {
  if (paths.length === 0) return "";
  const labels = paths.slice(0, 4).map((p) => VARIABLE_LABEL_CN[p] ?? p);
  const more = paths.length > 4 ? ` etc. ${paths.length} ítems` : "";
  return labels.join("、") + more;
}

// Que variables permiten autocompletado inline（Escribir y guardar en la tabla origen）—— y template-engine.ts applyOverrides Alinear
const EDITABLE_OVERRIDES = new Set([
  "client.idNumber",
  "client.address",
  "client.phone",
  "opposing.idNumber",
  "opposing.address",
  "opposing.phone"
]);

export function TemplatePickerDialog({
  open,
  onOpenChange,
  matterId,
  matterCategory,
  folders,
  templates
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  matterId: string;
  matterCategory: string;
  folders: FolderPayload[];
  templates: TemplateSummary[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string>("auto");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  // Aplicable a esteCasoPlantilla de la categoria（Incluye de categoria no limitada）
  const applicable = useMemo(
    () =>
      templates.filter(
        (t) =>
          t.applicableCategories.length === 0 ||
          t.applicableCategories.includes(matterCategory)
      ),
    [templates, matterCategory]
  );

  const grouped = useMemo(() => {
    const m = new Map<TemplateSummary["category"], TemplateSummary[]>();
    for (const t of applicable) {
      if (!m.has(t.category)) m.set(t.category, []);
      m.get(t.category)!.push(t);
    }
    return Array.from(m.entries());
  }, [applicable]);

  const selected = applicable.find((t) => t.id === selectedId) ?? null;

  // Listar los disponibles de esa plantillaEditarVariable（De la lista blanca）
  const editableVars = selected
    ? selected.variables.filter((v) => EDITABLE_OVERRIDES.has(v))
    : [];

  const reset = () => {
    setSelectedId(null);
    setTargetFolderId("auto");
    setOverrides({});
  };

  const submit = () => {
    if (!selected) return;
    startTransition(async () => {
      try {
        const res = await renderTemplate({
          matterId,
          templateId: selected.id,
          folderId: targetFolderId === "auto" ? null : targetFolderId,
          overrides
        });
        if (res.missing.length > 0) {
          toast.warning(`Ya generado「${res.fileName}」，Pero los siguientes campos estan vacios y deben completarse manualmente：${describeMissing(res.missing)}`);
        } else {
          toast.success(`Ya generado「${res.fileName}」Y archivar`);
        }
        // Disparar descarga
        window.open(`/api/documents/${res.documentId}/download`, "_blank");
        reset();
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "GenerarError");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Nuevo documento desde plantilla
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Elegir plantilla */}
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              1 · Elegir plantilla
            </Label>
            <div className="mt-2 max-h-[280px] overflow-y-auto rounded border border-border">
              {grouped.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  EseCasoNo hay plantillas disponibles para este tipo
                </p>
              ) : (
                grouped.map(([cat, items]) => (
                  <div key={cat}>
                    <div className="sticky top-0 bg-muted/40 px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {TEMPLATE_CATEGORY_CN[cat]}
                    </div>
                    {items.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedId(t.id)}
                        className={cn(
                          "flex w-full items-start gap-3 border-t border-border px-3 py-2 text-left transition-colors",
                          selectedId === t.id
                            ? "bg-primary/10"
                            : "hover:bg-muted/40"
                        )}
                      >
                        <FileText
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0",
                            selectedId === t.id ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                        <div className="flex-1">
                          <p className="text-[13px] font-medium">{t.name}</p>
                          {t.description && (
                            <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                              {t.description}
                            </p>
                          )}
                        </div>
                        {selectedId === t.id && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Step 2: Autocompletado inline */}
          {selected && editableVars.length > 0 && (
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                2 · Completar campos posiblemente faltantes
              </Label>
              <p className="mt-1 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                Estos campos se escriben inmediatamente en la tabla origen（Cliente/ContraparteMaterial），Traer automaticamente la proxima vez
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {editableVars.map((path) => (
                  <div key={path}>
                    <Label className="text-[11px]">{VARIABLE_LABEL_CN[path] ?? path}</Label>
                    <Input
                      value={overrides[path] ?? ""}
                      onChange={(e) =>
                        setOverrides((prev) => ({ ...prev, [path]: e.target.value }))
                      }
                      placeholder="Si ya existe DB Dejar vacio esta bien"
                      className="h-8 text-[12px]"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Elegir expediente */}
          {selected && (
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {editableVars.length > 0 ? "3" : "2"} · A que expediente archivar
              </Label>
              <Select value={targetFolderId} onValueChange={setTargetFolderId}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automatico（Recomendar por categoria de plantilla）</SelectItem>
                  {folders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                      {f.isDefault && (
                        <span className="ml-1 text-[10px] text-muted-foreground">· Por defecto</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!selected || pending}>
            {pending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Generar y descargar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
