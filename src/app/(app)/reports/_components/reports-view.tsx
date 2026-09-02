"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
import {
  Wallet,
  Briefcase,
  Archive,
  CheckCircle2,
  Download,
  BarChart3,
  CircleAlert,
  Send,
  Loader2,
  Printer,
} from "lucide-react";
import { matterCategoryLabel, matterCategoryColor } from "@/lib/enums";
import type { ReportData } from "@/server/reports/queries";
import type {
  CycleStats,
  ReviewIssueAnalysis,
} from "@/server/reports/analytics";
import { pushWeeklyReportToAll } from "@/server/reports/push-weekly";
import { triggerArchiveOverdueScanNow } from "@/server/cron/manual-triggers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PeriodKey = "month" | "quarter" | "year" | "lastYear" | "custom";

const PERIOD_LABEL: Record<Exclude<PeriodKey, "custom">, string> = {
  month: "Mes actual",
  quarter: "Trimestre actual",
  year: "Este año",
  lastYear: "Año anterior",
};

export function ReportsView({
  periodKey,
  periodLabel,
  customStart,
  customEnd,
  resolveError,
  data,
  cycle,
  reviewAnalysis,
  presetLabels,
}: {
  periodKey: PeriodKey;
  periodLabel: string;
  customStart?: string;
  customEnd?: string;
  resolveError?: string;
  data: ReportData;
  cycle: CycleStats[];
  reviewAnalysis: ReviewIssueAnalysis;
  presetLabels: Record<Exclude<PeriodKey, "custom">, string>;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [customOpen, setCustomOpen] = useState(periodKey === "custom");
  const [start, setStart] = useState(customStart ?? "");
  const [end, setEnd] = useState(customEnd ?? "");
  const [pushing, startPushing] = useTransition();
  const [scanning, startScanning] = useTransition();

  function handleScanOverdue() {
    if (
      !confirm(
        "¿Escaneás ahora los Casos cerrados hace más de 30 días sin archivar y enviás alertas de Notificaciones al Abogado principal?",
      )
    )
      return;
    startScanning(async () => {
      try {
        const r = await triggerArchiveOverdueScanNow();
        toast.success(
          `Escaneo de archivos vencidos completado: ${r.scanned} candidatos / ${r.notified} Notificaciones / ${r.suppressed} suprimidas`,
        );
      } catch (err) {
        toast.error("Error al escanear", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  function handlePushWeekly() {
    if (
      !confirm(
        "¿Enviás ahora el Informe de esta semana a todos los ADMIN / Abogado principal / Abogado? Cada uno recibe una Notificación.",
      )
    )
      return;
    startPushing(async () => {
      try {
        const res = await pushWeeklyReportToAll();
        if (res.failed.length === 0) {
          toast.success(
            `Se envió el Informe de esta semana (${res.weekLabel}) a ${res.succeeded} personas`,
          );
        } else {
          toast.warning(
            `Parcialmente exitoso: ${res.succeeded} enviados, ${res.failed.length} fallidos`,
            {
              description: res.failed
                .map((f) => f.error)
                .slice(0, 3)
                .join("；"),
            },
          );
        }
      } catch (err) {
        toast.error("Error al enviar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  function switchPreset(k: Exclude<PeriodKey, "custom">) {
    const next = new URLSearchParams(sp.toString());
    next.set("period", k);
    next.delete("start");
    next.delete("end");
    router.push(`/reports?${next.toString()}`);
    setCustomOpen(false);
  }

  function applyCustom() {
    if (!start || !end) return;
    const next = new URLSearchParams();
    next.set("period", "custom");
    next.set("start", start);
    next.set("end", end);
    router.push(`/reports?${next.toString()}`);
  }

  const maxCat = data.byCategory.reduce((m, c) => Math.max(m, c.count), 0);

  const exportHref = (() => {
    const q = new URLSearchParams();
    q.set("period", periodKey);
    if (periodKey === "custom" && customStart && customEnd) {
      q.set("start", customStart);
      q.set("end", customEnd);
    }
    return `/api/reports/export?${q.toString()}`;
  })();

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl">
            <BarChart3 className="h-5 w-5 text-primary" strokeWidth={1.8} />
            Reportes del bufete
          </h1>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Período de análisis:
            <span className="text-foreground">{periodLabel}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 ll-no-print">
          <div className="flex rounded-md border border-border bg-card p-0.5">
            {(["month", "quarter", "year", "lastYear"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => switchPreset(k)}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] transition-colors",
                  periodKey === k
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title={presetLabels[k]}
              >
                {PERIOD_LABEL[k]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCustomOpen((v) => !v)}
              className={cn(
                "rounded px-2.5 py-1 text-[11px] transition-colors",
                periodKey === "custom"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Personalizado
            </button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleScanOverdue}
            disabled={scanning}
            className="gap-1.5"
            title="Escanear Casos cerrados hace más de 30 días sin archivar"
          >
            {scanning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Escanear archivo vencido
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handlePushWeekly}
            disabled={pushing}
            className="gap-1.5"
            title="Enviar el Informe de esta semana por Notificaciones a todos los Abogados"
          >
            {pushing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Enviar informe semanal
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="gap-1.5"
            title="También se puede activar con Cmd/Ctrl+P; podés «Guardar como PDF»"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir / PDF
          </Button>
          <Link href={exportHref} prefetch={false}>
            <Button size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Exportar xlsx
            </Button>
          </Link>
        </div>
      </header>

      {customOpen && (
        <div className="ll-no-print flex flex-wrap items-end gap-2 rounded-md border border-border bg-card p-3 text-xs">
          <div>
            <label className="text-muted-foreground">Inicio (incl.)</label>
            <Input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="mt-0.5 h-8 w-36 text-[12px]"
            />
          </div>
          <span className="pb-2 text-muted-foreground">~</span>
          <div>
            <label className="text-muted-foreground">Fin (incl.)</label>
            <Input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="mt-0.5 h-8 w-36 text-[12px]"
            />
          </div>
          <Button size="sm" onClick={applyCustom} disabled={!start || !end}>
            Aplicar
          </Button>
          <span className="ml-2 text-[10px] text-muted-foreground">
            Máximo de 5 años
          </span>
        </div>
      )}

      {resolveError && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{resolveError}</span>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          icon={Briefcase}
          label="Nuevos ingresos del período"
          value={data.kpis.newIntake}
          color="#5B8DEF"
        />
        <Kpi
          icon={Wallet}
          label="En trámite"
          value={data.kpis.inProgress}
          color="#F5A742"
        />
        <Kpi
          icon={CheckCircle2}
          label="Cerrados este período"
          value={data.kpis.closed}
          color="#48BB78"
        />
        <Kpi
          icon={Archive}
          label="Archivados este período"
          value={data.kpis.archived}
          color="#9B7BF7"
          hint={
            data.kpis.closed > 0
              ? `Tasa de archivo ${Math.round(data.kpis.archiveRate * 100)}%`
              : ""
          }
        />
      </div>

      {/* Clasificación por categoría */}
      <section className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-medium">
          Nuevos ingresos del período · Distribución por categoría
        </h3>
        {data.byCategory.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay Casos nuevos en este período
          </p>
        ) : (
          <ul className="space-y-2">
            {data.byCategory.map((c) => {
              const pct = maxCat > 0 ? (c.count / maxCat) * 100 : 0;
              const color = matterCategoryColor[c.category];
              return (
                <li
                  key={c.category}
                  className="flex items-center gap-3 text-xs"
                >
                  <span className="w-16 shrink-0 text-foreground/80">
                    {matterCategoryLabel[c.category]}
                  </span>
                  <div className="flex-1">
                    <div
                      className="h-4 rounded"
                      style={{
                        width: `${pct}%`,
                        minWidth: c.count > 0 ? 8 : 0,
                        backgroundColor: `${color}99`,
                      }}
                    />
                  </div>
                  <span className="w-10 shrink-0 font-mono text-right text-foreground">
                    {c.count}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* Productividad del Abogado */}
        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium">
            Productividad del Abogado · Este período
          </h3>
          {data.byLawyer.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No hay datos de productividad para este período
            </p>
          ) : (
            <div className="overflow-hidden rounded border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-normal">
                      Abogado
                    </th>
                    <th className="px-2 py-1.5 text-right font-normal">
                      Nuevos
                    </th>
                    <th className="px-2 py-1.5 text-right font-normal">
                      Cerrados
                    </th>
                    <th className="px-2 py-1.5 text-right font-normal">
                      Cobrado (ARS)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.byLawyer.map((r) => (
                    <tr key={r.userId}>
                      <td className="px-2 py-1.5">{r.name}</td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {r.ownedCount}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {r.closedCount}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {r.receivedAmount.toLocaleString("zh-CN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Cuentas por cobrar del Cliente */}
        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium">
            Cuentas por cobrar del Cliente · Este período
          </h3>
          {data.byClientReceivable.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No hay datos de cuentas por cobrar en este período
            </p>
          ) : (
            <div className="overflow-hidden rounded border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-normal">
                      Cliente
                    </th>
                    <th className="px-2 py-1.5 text-right font-normal">
                      Por cobrar
                    </th>
                    <th className="px-2 py-1.5 text-right font-normal">
                      Cobrado
                    </th>
                    <th className="px-2 py-1.5 text-right font-normal">
                      Saldo
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.byClientReceivable.map((r) => (
                    <tr key={r.clientId}>
                      <td className="px-2 py-1.5">{r.name}</td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {r.receivable.toLocaleString("zh-CN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-emerald-600">
                        {r.received.toLocaleString("zh-CN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td
                        className={cn(
                          "px-2 py-1.5 text-right font-mono",
                          r.balance > 0
                            ? "text-rose-600"
                            : "text-muted-foreground",
                        )}
                      >
                        {r.balance.toLocaleString("zh-CN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Análisis del plazo del caso */}
      <section className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-medium">
          Duración del caso · Casos cerrados este período (Ingreso → Cierre)
        </h3>
        {cycle.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay Casos cerrados en este período
          </p>
        ) : (
          <div className="overflow-hidden rounded border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 text-left font-normal">
                    Categoría
                  </th>
                  <th className="px-2 py-1.5 text-right font-normal">
                    Muestra
                  </th>
                  <th className="px-2 py-1.5 text-right font-normal">
                    Promedio (días)
                  </th>
                  <th className="px-2 py-1.5 text-right font-normal">
                    Mediana (días)
                  </th>
                  <th className="px-2 py-1.5 text-right font-normal">
                    Más rápido (días)
                  </th>
                  <th className="px-2 py-1.5 text-right font-normal">
                    Más lento (días)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cycle.map((r) => (
                  <tr key={r.category}>
                    <td className="px-2 py-1.5">
                      {matterCategoryLabel[r.category]}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {r.count}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {r.avgDays}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {r.medianDays}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-emerald-600">
                      {r.minDays}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-rose-600">
                      {r.maxDays}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* AI review top issues */}
      <section className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
          Revisión de IA · Problemas frecuentes del período
          <span className="text-[10px] font-normal text-muted-foreground">
            ({reviewAnalysis.recordCount} revisiones /{" "}
            {reviewAnalysis.documentCount} documentos /{" "}
            {reviewAnalysis.totalItems} problemas)
          </span>
        </h3>
        {reviewAnalysis.totalItems === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay registros de revisión de IA en este período
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <SevTotalChip sev="HIGH" n={reviewAnalysis.bySeverity.HIGH} />
              <SevTotalChip sev="MEDIUM" n={reviewAnalysis.bySeverity.MEDIUM} />
              <SevTotalChip sev="LOW" n={reviewAnalysis.bySeverity.LOW} />
            </div>
            <div className="overflow-hidden rounded border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-normal">
                      Título del problema
                    </th>
                    <th className="px-2 py-1.5 text-left font-normal w-20">
                      Tipo
                    </th>
                    <th className="px-2 py-1.5 text-right font-normal w-16">
                      Cantidad
                    </th>
                    <th className="px-2 py-1.5 text-right font-normal w-32">
                      Alta/Media/Baja
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reviewAnalysis.topIssues.map((iss) => (
                    <tr key={iss.title}>
                      <td className="px-2 py-1.5">{iss.title}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">
                        {TYPE_CN[iss.type]}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {iss.occurrences}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-[10px]">
                        <span className="text-rose-600">
                          {iss.severityCounts.HIGH}
                        </span>
                        <span className="mx-0.5 text-muted-foreground">/</span>
                        <span className="text-amber-600">
                          {iss.severityCounts.MEDIUM}
                        </span>
                        <span className="mx-0.5 text-muted-foreground">/</span>
                        <span className="text-slate-500">
                          {iss.severityCounts.LOW}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

const TYPE_CN = {
  MISSING: "Faltante",
  RISK: "Riesgo",
  ISSUE: "Problema",
  SUGGESTION: "Sugerencia",
} as const;

function SevTotalChip({
  sev,
  n,
}: {
  sev: "HIGH" | "MEDIUM" | "LOW";
  n: number;
}) {
  const meta = {
    HIGH: { label: "Alta", cls: "border-rose-200 bg-rose-50 text-rose-700" },
    MEDIUM: {
      label: "Media",
      cls: "border-amber-200 bg-amber-50 text-amber-700",
    },
    LOW: { label: "Baja", cls: "border-slate-200 bg-slate-50 text-slate-600" },
  }[sev];
  return (
    <div className={cn("rounded border px-3 py-2 text-xs", meta.cls)}>
      <div className="text-[10px] opacity-80">{meta.label}</div>
      <div className="mt-0.5 font-mono text-lg">{n}</div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  color,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  color: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md"
          style={{ backgroundColor: `${color}1F`, color }}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
        </span>
      </div>
      <div className="mt-1 font-mono text-2xl tabular text-foreground">
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}
