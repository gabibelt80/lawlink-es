import { Sparkles, AlertTriangle, FileText } from "lucide-react";
import type { MatterReviewSummary } from "@/server/ai/matter-review-summary";
import { cn } from "@/lib/utils";
import { BatchReviewButton } from "./batch-review-button";

export function ReviewSummaryCard({
  summary,
  matterId
}: {
  summary: MatterReviewSummary;
  matterId: string;
}) {
  const hasRecords = summary.recordCount > 0;

  // v0.27: AI Entrada de rechequeo temporalmente oculta —— Si no hay registros, no renderizar la tarjeta entera（Evitar avisos vacios sin boton）
  if (!hasRecords) {
    return null;
  }

  return (
    <section className="rounded-lg border border-violet-200 bg-violet-50/40 p-3">
      <header className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-medium text-violet-700">
          <Sparkles className="h-3.5 w-3.5" />
          AI RevisionTotalVista
        </h3>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-muted-foreground">
            {summary.documentCount} Documentos · {summary.recordCount} Siguiente revision · Total {summary.totalItems} Elementos
            {summary.latestReviewedAt && (
              <span className="ml-2">Mas reciente {summary.latestReviewedAt.toLocaleDateString("zh-CN")}</span>
            )}
          </span>
          <BatchReviewButton matterId={matterId} />
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <SevTile sev="HIGH" n={summary.bySeverity.HIGH} />
        <SevTile sev="MEDIUM" n={summary.bySeverity.MEDIUM} />
        <SevTile sev="LOW" n={summary.bySeverity.LOW} />
      </div>

      {summary.topHighItems.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-1 text-[10px] text-rose-700">
            <AlertTriangle className="h-3 w-3" />
            Reciente HIGH Riesgo（Maximo 3 Elementos）
          </div>
          <ul className="space-y-1">
            {summary.topHighItems.map((it, i) => (
              <li
                key={`${it.documentId}-${i}`}
                className="rounded border border-rose-200/60 bg-background px-2 py-1.5 text-xs"
              >
                <div className="font-medium">{it.title}</div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-foreground/70">
                  {it.detail}
                </p>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <FileText className="h-2.5 w-2.5" />
                  <span className="truncate">{it.documentName}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function SevTile({ sev, n }: { sev: "HIGH" | "MEDIUM" | "LOW"; n: number }) {
  const meta = {
    HIGH: { label: "Riesgo alto", cls: "border-rose-300 bg-rose-50 text-rose-700" },
    MEDIUM: { label: "Riesgo medio", cls: "border-amber-300 bg-amber-50 text-amber-700" },
    LOW: { label: "Riesgo bajo", cls: "border-slate-300 bg-slate-50 text-slate-600" }
  }[sev];
  return (
    <div className={cn("rounded border px-2 py-1.5", meta.cls)}>
      <div className="text-[10px] opacity-80">{meta.label}</div>
      <div className="mt-0.5 font-mono text-base leading-none">{n}</div>
    </div>
  );
}
