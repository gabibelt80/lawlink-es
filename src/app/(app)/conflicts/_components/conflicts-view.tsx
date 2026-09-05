"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Briefcase,
} from "lucide-react";
import type {
  ConflictSeverity,
  LitigationStanding,
  MatterCategory,
  MatterStatus,
  PartyRole,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { runCheckAndSave } from "@/server/conflicts/actions";
import { cn } from "@/lib/utils";
import {
  litigationStandingLabel,
  matterCategoryLabel,
  matterStatusLabel,
} from "@/lib/enums";
import { matterHref } from "@/lib/matters/route";

type QueryRole = "CLIENT_PARTY" | "OPPOSING_PARTY" | "THIRD_PARTY";

type QueryRow = {
  role: QueryRole;
  name: string;
  idNumber: string;
};

type HitResult = {
  id: string;
  hitType: string;
  targetType: string;
  targetId: string;
  matchedName: string;
  matchedField: string;
  matchedValue: string;
  matchedRatio: number | null;
  severity: ConflictSeverity;
  reason: string;
  matterInfo: {
    matterId: string | null;
    canViewMatter: boolean;
    internalCode: string;
    title: string;
    category: MatterCategory;
    status: MatterStatus;
    intakeDate: string | null;
    causeText: string | null;
    ownerName: string | null;
    partyRole: PartyRole;
    partyStanding: LitigationStanding | null;
  } | null;
};

const severityStyle: Record<
  ConflictSeverity,
  { color: string; bg: string; label: string }
> = {
  BLOCKING: { color: "#B91C1C", bg: "#FBE9E9", label: "Bloqueante" },
  HIGH: { color: "#B45309", bg: "#FBEDD8", label: "Alto" },
  MEDIUM: { color: "#9A6700", bg: "#FBF1DC", label: "Medio" },
  LOW: { color: "#15803D", bg: "#E6F2EC", label: "Bajo" },
};

const queryRoleOptions: { value: QueryRole; label: string }[] = [
  { value: "CLIENT_PARTY", label: "Futuro cliente" },
  { value: "OPPOSING_PARTY", label: "Parte contraria" },
  { value: "THIRD_PARTY", label: "Tercero" },
];

const partyRoleLabel: Record<PartyRole, string> = {
  CLIENT_PARTY: "Cliente",
  OPPOSING_PARTY: "Contraria",
  THIRD_PARTY: "Tercero",
  CO_LITIGANT: "Colitigante",
  AGENT: "Representante",
  WITNESS: "Testigo",
  OTHER: "Otro",
};

function emptyQuery(): QueryRow {
  return { role: "CLIENT_PARTY", name: "", idNumber: "" };
}

export function ConflictsView() {
  const [isPending, startTransition] = useTransition();
  const [queries, setQueries] = useState<QueryRow[]>([emptyQuery()]);
  const [results, setResults] = useState<HitResult[] | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const resultCounts = summarizeResults(results);

  function addQuery() {
    setQueries((q) => [...q, emptyQuery()]);
  }

  function removeQuery(idx: number) {
    setQueries((q) => q.filter((_, i) => i !== idx));
  }

  function updateQuery(idx: number, patch: Partial<QueryRow>) {
    setQueries((q) =>
      q.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    );
  }

  function handleRun() {
    const cleaned = queries
      .map((q) => ({
        role: q.role,
        name: q.name.trim(),
        idNumber: q.idNumber.trim(),
      }))
      .filter((q) => q.name || q.idNumber);
    if (cleaned.length === 0) {
      toast.warning("Completá al menos un nombre o número de documento");
      return;
    }

    startTransition(async () => {
      try {
        const res = await runCheckAndSave({ queries: cleaned });
        setResults(res.hits);
        setHasRun(true);
        toast.success(`Búsqueda completada, ${res.hits.length} coincidencias`);
      } catch (err) {
        toast.error("Error de búsqueda", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      <header className="ll-hero-surface px-5 py-4">
        <h1 className="relative z-[1] flex items-center gap-2 text-[20px] font-semibold">
          <ShieldCheck className="h-5 w-5 text-primary" strokeWidth={1.8} />
          Búsqueda de conflictos
        </h1>
        <p className="relative z-[1] mt-2 max-w-2xl text-[13px] text-muted-foreground">
          El futuro cliente, la parte contraria o el tercero que se pretenda representar deben compararse primero con los sujetos de clientes y casos históricos. Si se detecta un conflicto bloqueante, se recomienda detener la admisión y dejar constancia de la conclusión.
        </p>
      </header>

      <section className="ll-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="ll-panel-title">Ítems de búsqueda</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={addQuery}
            className="h-7 gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar ítem de búsqueda
          </Button>
        </div>

        <div className="space-y-2">
          {queries.map((q, idx) => (
            <div
              key={idx}
              className="grid grid-cols-12 gap-2 rounded-lg border border-border bg-muted/55 p-3"
            >
              <div className="col-span-3">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Tipo de sujeto
                </Label>
                <Select
                  value={q.role}
                  onValueChange={(value) =>
                    updateQuery(idx, { role: value as QueryRole })
                  }
                >
                  <SelectTrigger className="mt-1 h-[34px] bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {queryRoleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Nombre y apellido / Razón social
                </Label>
                <Input
                  value={q.name}
                  onChange={(e) => updateQuery(idx, { name: e.target.value })}
                  placeholder="Ej.: Grupo Inmobiliario Huadong S.A."
                  className="mt-1 h-[34px] bg-card"
                />
              </div>
              <div className="col-span-4">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  DNI / código de crédito social unificado
                </Label>
                <Input
                  value={q.idNumber}
                  onChange={(e) =>
                    updateQuery(idx, { idNumber: e.target.value })
                  }
                  placeholder="Completá al menos nombre o documento"
                  className="mt-1 h-[34px] bg-card font-mono"
                />
              </div>
              <div className="col-span-1 flex items-end justify-center">
                {queries.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuery(idx)}
                    className="h-9 w-9 p-0 text-destructive"
                    aria-label="Quitar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleRun} disabled={isPending} className="gap-1.5">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Iniciar búsqueda
          </Button>
        </div>
      </section>

      {hasRun && (
        <section className="ll-surface p-4">
          <h2 className="mb-3 text-sm font-semibold">
            Resultados de búsqueda{" "}
            <span className="font-mono text-xs text-muted-foreground tabular">
              ({results?.length ?? 0})
            </span>
          </h2>
          <ConflictSummaryBar counts={resultCounts} />

          {!results || results.length === 0 ? (
            <div className="rounded-md border border-[#15803D]/30 bg-[#E6F2EC] p-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#15803D]" />
                <span>No se encontraron coincidencias con clientes o casos históricos</span>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {results.map((h) => {
                const style = severityStyle[h.severity];
                const targetHref =
                  h.matterInfo?.canViewMatter && h.matterInfo.matterId
                    ? matterHref({
                        id: h.matterInfo.matterId,
                        internalCode: h.matterInfo.internalCode,
                      })
                    : h.targetType === "Client"
                      ? `/clients/${h.targetId}`
                      : null;
                return (
                  <li
                    key={h.id}
                    className="rounded-md border p-3"
                    style={{
                      borderColor: `${style.color}40`,
                      backgroundColor: style.bg,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <AlertTriangle
                            className="h-3.5 w-3.5"
                            style={{ color: style.color }}
                          />
                          <span
                            className="text-xs font-semibold uppercase tracking-wider"
                            style={{ color: style.color }}
                          >
                            {style.label}
                          </span>
                          <span className={cn("text-xs text-muted-foreground")}>
                            ·
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {h.hitType === "HISTORICAL_CLIENT"
                              ? "Cliente histórico"
                              : "Caso histórico"}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm">{h.reason}</p>
                        {h.matterInfo && (
                          <MatterContext info={h.matterInfo} hit={h} />
                        )}
                        <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                          Campo coincidente: {h.matchedField} = {h.matchedValue}
                          {h.matchedRatio !== null && h.matchedRatio < 1 && (
                            <span className="ml-2">
                              Similitud {(h.matchedRatio * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                      {targetHref && (
                        <Link
                          href={targetHref}
                          className="flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Ver
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function summarizeResults(results: HitResult[] | null) {
  const counts: Record<ConflictSeverity, number> = {
    BLOCKING: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };
  for (const hit of results ?? []) {
    counts[hit.severity] += 1;
  }
  return counts;
}

function ConflictSummaryBar({
  counts,
}: {
  counts: Record<ConflictSeverity, number>;
}) {
  const hasBlocking = counts.BLOCKING > 0;
  const total = counts.BLOCKING + counts.HIGH + counts.MEDIUM + counts.LOW;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/55 px-3 py-2 text-xs">
      <span className="font-semibold">Resumen de riesgos</span>
      <RiskCount severity="BLOCKING" label="Bloqueante" count={counts.BLOCKING} />
      <RiskCount severity="HIGH" label="Alto" count={counts.HIGH} />
      <RiskCount severity="MEDIUM" label="Medio" count={counts.MEDIUM} />
      <RiskCount severity="LOW" label="Bajo" count={counts.LOW} />
      <span className="ml-auto rounded-full border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground">
        {total === 0
          ? "Sin conflictos históricos"
          : hasBlocking
            ? "Existe conflicto bloqueante, admisión con precaución"
            : "Existen coincidencias de riesgo, se requiere verificación adicional"}
      </span>
    </div>
  );
}

function RiskCount({
  severity,
  label,
  count,
}: {
  severity: ConflictSeverity;
  label: string;
  count: number;
}) {
  const style = severityStyle[severity];

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: style.color }}
        aria-hidden="true"
      />
      <span className="font-mono tabular" style={{ color: style.color }}>
        {count}
      </span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function MatterContext({
  info,
  hit,
}: {
  info: NonNullable<HitResult["matterInfo"]>;
  hit: HitResult;
}) {
  const causeOrCategory = info.causeText ?? matterCategoryLabel[info.category];
  return (
    <div className="mt-2 rounded border border-border/80 bg-background/70 p-2.5 text-[12px]">
      <div className="mb-2 flex items-center gap-1.5">
        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-[11px] text-muted-foreground">
          {info.internalCode}
        </span>
        <span className="min-w-0 truncate font-medium text-foreground">
          {info.title}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-muted-foreground md:grid-cols-3">
        <Field label="Admisión al sistema">{formatDate(info.intakeDate)}</Field>
        <Field label="Estado actual">{matterStatusLabel[info.status]}</Field>
        <Field label="Causa/tipo">{causeOrCategory}</Field>
        <Field label="Abogado principal">{info.ownerName ?? "—"}</Field>
        <Field label="Rol coincidente">
          {partyRoleLabel[info.partyRole]}
          {info.partyStanding
            ? ` · ${litigationStandingLabel[info.partyStanding]}`
            : ""}
        </Field>
        <Field label="Sujeto coincidente">{hit.matchedName}</Field>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 gap-1.5">
      <span className="shrink-0 text-muted-foreground/70">{label}:</span>
      <span className="truncate text-foreground/85">{children}</span>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-AR");
}