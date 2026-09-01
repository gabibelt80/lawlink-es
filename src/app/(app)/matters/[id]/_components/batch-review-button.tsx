"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  batchReviewMatterDocuments,
  type BatchReviewSummary,
} from "@/server/ai/batch-review-matter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// v0.27: AI 复检功能暂时隐藏（后端 server action 保留），改回时去掉此 flag
const SHOW_AI_RECHECK = false;

export function BatchReviewButton({ matterId }: { matterId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<BatchReviewSummary | null>(null);
  const [open, setOpen] = useState(false);

  if (!SHOW_AI_RECHECK) return null;

  function run() {
    if (
      !confirm(
        "¿Desea continuar? Se revisarán hasta 5 documentos del caso que aún no hayan sido revisados con IA (se consumirán tokens de IA).",
      )
    )
      return;
    startTransition(async () => {
      try {
        const r = await batchReviewMatterDocuments({ matterId });
        setResult(r);
        setOpen(true);
        const totalErrors = r.errors.length;
        if (r.reviewed.length === 0 && totalErrors === 0) {
          toast.info("No hay documentos nuevos que revisar");
        } else if (totalErrors > 0) {
          toast.warning(
            `Revisados ${r.reviewed.length}, fallidos ${totalErrors}`,
          );
        } else {
          toast.success(`Se revisaron ${r.reviewed.length} documentos`);
        }
        router.refresh();
      } catch (err) {
        toast.error("Error al revisar por lotes", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={run}
        disabled={pending}
        className="gap-1"
        title="Inicia la revisión por IA de los documentos no revisados del caso en lote (máximo 5 por vez)"
      >
        {pending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Sparkles className="h-3 w-3" />
        )}
        Revisión AI Ver todos
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Resultado de la revisión de IA
            </DialogTitle>
            <DialogDescription>
              Se pueden revisar hasta 5 documentos por vez; los revisados en los
              últimos 7 días se omiten
            </DialogDescription>
          </DialogHeader>

          {result && (
            <div className="space-y-3 text-xs">
              {result.reviewed.length > 0 && (
                <section>
                  <h4 className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                    <Check className="h-3 w-3" />
                    Revisados ({result.reviewed.length})
                  </h4>
                  <ul className="space-y-1">
                    {result.reviewed.map((r) => (
                      <li
                        key={r.documentId}
                        className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1.5"
                      >
                        <span className="truncate">{r.documentName}</span>
                        <span className="ml-2 font-mono text-[10px] text-emerald-700">
                          {r.itemCount} cuestiones
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {result.errors.length > 0 && (
                <section>
                  <h4 className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-destructive">
                    <X className="h-3 w-3" />
                    Fallidos ({result.errors.length})
                  </h4>
                  <ul className="space-y-1">
                    {result.errors.map((r) => (
                      <li
                        key={r.documentId}
                        className="rounded border border-rose-200 bg-rose-50 px-2 py-1.5 text-rose-700"
                      >
                        <div className="font-medium">{r.documentName}</div>
                        <div className="text-[10px]">{r.error}</div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {result.skipped.length > 0 && (
                <section>
                  <h4 className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                    Omitidos ({result.skipped.length})
                  </h4>
                  <ul className="max-h-32 space-y-1 overflow-y-auto">
                    {result.skipped.map((s) => (
                      <li
                        key={s.documentId}
                        className="rounded border border-border bg-muted/30 px-2 py-1 text-muted-foreground"
                      >
                        <span className="truncate">{s.documentName}</span>
                        <span className="ml-2 text-[10px]">{s.reason}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
