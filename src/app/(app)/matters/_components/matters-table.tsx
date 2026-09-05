"use client";

import Link from "next/link";
import type { Matter, PartyRole, LitigationStanding } from "@prisma/client";
import {
  matterCategoryColor,
  matterCategoryShort,
  matterStatusLabel,
} from "@/lib/enums";
import { formatCurrency, cn } from "@/lib/utils";
import { matterHref } from "@/lib/matters/route";

export type MatterRow = Omit<Matter, "claimAmount"> & {
  primaryClient: { id: string; name: string } | null;
  owner: { id: string; name: string } | null;
  cause: { id: string; name: string } | null;
  procedures: {
    id: string;
    type: string;
    caseNumber: string | null;
    status: string;
  }[];
  parties: {
    id: string;
    name: string;
    role: PartyRole;
    standing: LitigationStanding | null;
  }[];
  archiveRecords?: { id: string }[];
  _count: { procedures: number };
  claimAmount: number | null;
  firmCaseNo: string | null;
  intakeDate: Date | null;
  latestHearingAt: Date | null;
};

type MetaColumn = "hearing" | "firmCaseNo";

const MATTER_ROW_GRID =
  "grid gap-x-3 gap-y-2 lg:grid-cols-[1rem_minmax(12rem,1.2fr)_7rem_minmax(8rem,0.7fr)_minmax(10rem,1fr)_5.5rem_4.5rem] lg:items-center";
const MATTER_ROW_GRID_WITH_INTAKE =
  "grid gap-x-3 gap-y-2 lg:grid-cols-[7rem_minmax(12rem,1.2fr)_minmax(8rem,0.7fr)_minmax(10rem,1fr)_5.5rem_4.5rem] lg:items-center";
const MATTER_ROW_GRID_WITH_ARCHIVE =
  "grid gap-x-3 gap-y-2 lg:grid-cols-[7rem_minmax(12rem,1.2fr)_minmax(8rem,0.7fr)_minmax(10rem,1fr)_7rem_4.5rem] lg:items-center";

export function CaseListHeader({
  metaColumn = "hearing",
  detailColumnLabel = "N° de caso",
  showIntakeDateColumn = false,
  showArchiveDateColumn = false,
}: {
  metaColumn?: MetaColumn;
  detailColumnLabel?: string;
  showIntakeDateColumn?: boolean;
  showArchiveDateColumn?: boolean;
}) {
  const metaHeader = (
    <div>
      {metaColumn === "firmCaseNo" ? "N° interno" : "Fecha de audiencia"}
    </div>
  );

  return (
    <div
      className={cn(
        showArchiveDateColumn
          ? MATTER_ROW_GRID_WITH_ARCHIVE
          : showIntakeDateColumn
            ? MATTER_ROW_GRID_WITH_INTAKE
            : MATTER_ROW_GRID,
        "hidden border-b border-border bg-muted px-5 py-2 text-[10px] font-semibold uppercase text-muted-foreground lg:grid",
      )}
    >
      {showArchiveDateColumn ? (
        <div>Fecha de archivo</div>
      ) : showIntakeDateColumn ? (
        <div>Fecha de admisión</div>
      ) : (
        <div />
      )}
      <div>Caso</div>
      {!showIntakeDateColumn && !showArchiveDateColumn ? metaHeader : null}
      <div>Cliente</div>
      <div>{detailColumnLabel}</div>
      {showArchiveDateColumn ? metaHeader : null}
      {showArchiveDateColumn ? null : <div>Monto</div>}
      <div>Estado</div>
    </div>
  );
}

export function MattersTable({
  items,
  metaColumn = "hearing",
  showIntakeDateColumn = false,
  showArchiveDateColumn = false,
}: {
  items: MatterRow[];
  metaColumn?: MetaColumn;
  showIntakeDateColumn?: boolean;
  showArchiveDateColumn?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-card py-20 text-center">
        <div className="text-base text-muted-foreground">
          No hay Casos coincidentes
        </div>
        <div className="text-xs text-muted-foreground/70">
          Haz clic en <span className="text-foreground/80">Nuevo caso</span>{" "}
          arriba a la derecha para comenzar
        </div>
      </div>
    );
  }

  return (
    <div className="ll-surface overflow-hidden">
      <CaseListHeader
        metaColumn={metaColumn}
        showIntakeDateColumn={showIntakeDateColumn}
        showArchiveDateColumn={showArchiveDateColumn}
      />
      <ul>
        {items.map((m) => (
          <CaseListCard
            key={m.id}
            href={matterHref(m)}
            title={m.title}
            accent={matterCategoryColor[m.category]}
            status={{
              label:
                (m.archiveRecords?.length ?? 0) > 0
                  ? "Archivado"
                  : matterStatusLabel[m.status],
              dot:
                (m.archiveRecords?.length ?? 0) > 0
                  ? MATTER_STATUS_DOT.ARCHIVED
                  : MATTER_STATUS_DOT[m.status],
            }}
            categoryShort={matterCategoryShort[m.category]}
            intakeDate={m.intakeDate}
            archivedAt={m.archivedAt}
            latestHearingAt={m.latestHearingAt}
            firmCaseNo={m.firmCaseNo}
            showTitleMeta={false}
            clientName={m.primaryClient?.name ?? null}
            detailColumnLabel="N° de caso"
            procedureLabel={m.procedures[0]?.caseNumber ?? null}
            procedureFallback="Sin número aún"
            proceduresCount={m._count.procedures}
            claimAmount={m.claimAmount}
            metaColumn={metaColumn}
            showIntakeDateColumn={showIntakeDateColumn}
            showArchiveDateColumn={showArchiveDateColumn}
            inTable
          />
        ))}
      </ul>
    </div>
  );
}

const MATTER_STATUS_DOT: Record<MatterRow["status"], string> = {
  PENDING_ACCEPTANCE: "#9A6700",
  IN_PROGRESS: "#1E40AF",
  ON_HOLD: "#94a3b8",
  CLOSED: "#15803D",
  ARCHIVED: "#6B21A8",
};

// Tarjeta general: para MattersTable + IntakesTable
export function CaseListCard({
  href,
  title,
  accent,
  status,
  categoryShort,
  intakeDate,
  archivedAt = null,
  latestHearingAt = null,
  firmCaseNo = null,
  showTitleMeta = true,
  showTitleFirmCaseNo = true,
  clientName = null,
  detailColumnLabel = "N° de caso",
  procedureLabel = null,
  procedureFallback = "Sin número aún",
  procedureValueClassName,
  showProcedureDots = true,
  proceduresCount = 0,
  claimAmount,
  metaColumn = "hearing",
  showIntakeDateColumn = false,
  showArchiveDateColumn = false,
  inTable = false,
}: {
  href: string;
  title: string;
  accent: string;
  status: { label: string; dot: string };
  categoryShort: string;
  intakeDate: Date | null;
  archivedAt?: Date | null;
  latestHearingAt?: Date | null;
  firmCaseNo?: string | null;
  showTitleMeta?: boolean;
  showTitleFirmCaseNo?: boolean;
  clientName?: string | null;
  detailColumnLabel?: string;
  procedureLabel?: string | null;
  procedureFallback?: string;
  procedureValueClassName?: string;
  showProcedureDots?: boolean;
  proceduresCount?: number;
  claimAmount: number | null;
  metaColumn?: MetaColumn;
  showIntakeDateColumn?: boolean;
  showArchiveDateColumn?: boolean;
  inTable?: boolean;
}) {
  const hasLeadingDateColumn = showIntakeDateColumn || showArchiveDateColumn;
  const metaCell = showIntakeDateColumn ? null : (
    <DataCell
      label={metaColumn === "firmCaseNo" ? "N° interno" : "Fecha de audiencia"}
    >
      {metaColumn === "firmCaseNo" ? (
        <span className="font-mono tabular-nums text-foreground/75">
          {firmCaseNo || "—"}
        </span>
      ) : (
        <span
          className={cn(
            "font-mono tabular-nums",
            latestHearingAt ? "text-primary" : "text-muted-foreground/55",
          )}
        >
          {formatDateTime(latestHearingAt)}
        </span>
      )}
    </DataCell>
  );

  return (
    <li
      className={cn(
        inTable
          ? "border-t border-border first:border-t-0"
          : "rounded-lg border border-border bg-card",
      )}
    >
      <Link
        href={href}
        className={cn(
          "group block transition-colors",
          inTable
            ? "px-5 py-3 hover:bg-muted"
            : "rounded-lg px-4 py-3 hover:bg-muted",
        )}
      >
        <div
          className={
            showArchiveDateColumn
              ? MATTER_ROW_GRID_WITH_ARCHIVE
              : showIntakeDateColumn
                ? MATTER_ROW_GRID_WITH_INTAKE
                : MATTER_ROW_GRID
          }
        >
          {hasLeadingDateColumn ? (
            <DataCell
              label={
                showArchiveDateColumn ? "Fecha de archivo" : "Fecha de admisión"
              }
            >
              <span className="font-mono tabular-nums text-foreground/75">
                {formatDate(showArchiveDateColumn ? archivedAt : intakeDate)}
              </span>
            </DataCell>
          ) : (
            <div className="hidden lg:block">
              <span
                className={cn(
                  "ll-dot",
                  latestHearingAt
                    ? "bg-[#B91C1C] shadow-[0_0_0_3px_rgba(185,28,28,0.14)]"
                    : "bg-primary",
                )}
              />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start gap-2">
              <span
                aria-hidden
                className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-sm border px-1 text-[10.5px] font-medium leading-none"
                style={{
                  background: `${accent}14`,
                  borderColor: `${accent}66`,
                  color: accent,
                }}
              >
                {categoryShort}
              </span>
              <div className="min-w-0">
                <span className="block min-w-0 truncate text-[13.5px] font-medium leading-5 text-foreground">
                  {title || "(Sin nombre)"}
                </span>
                {showTitleMeta ? (
                  <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground tabular">
                    {showTitleFirmCaseNo && firmCaseNo
                      ? firmCaseNo
                      : formatDate(intakeDate)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {!hasLeadingDateColumn ? metaCell : null}

          <DataCell label="Cliente">
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent text-[10px] font-semibold text-primary">
                {(clientName ?? "Sin").charAt(0)}
              </span>
              <span className="truncate text-[12.5px] text-muted-foreground">
                {clientName ?? "Cliente no asociado"}
              </span>
            </span>
          </DataCell>

          <DataCell label={detailColumnLabel}>
            <span className="flex min-w-0 items-center gap-1.5">
              {showProcedureDots ? (
                <span className="ll-dot bg-primary" />
              ) : null}
              {showProcedureDots && proceduresCount > 1 ? (
                <span className="ll-dot bg-primary/40" />
              ) : null}
              <span
                className={cn(
                  "truncate text-[12px] text-muted-foreground",
                  procedureValueClassName ?? "font-mono tabular-nums",
                )}
              >
                {procedureLabel ?? procedureFallback}
              </span>
            </span>
          </DataCell>

          {hasLeadingDateColumn ? metaCell : null}

          {showArchiveDateColumn ? null : (
            <DataCell label="Monto">
              <span className="font-mono text-[12px] tabular-nums text-foreground/75">
                {claimAmount != null
                  ? formatCurrency(claimAmount, { compact: true })
                  : "—"}
              </span>
            </DataCell>
          )}

          <DataCell label="Estado">
            <StatusChip label={status.label} dot={status.dot} />
          </DataCell>
        </div>
      </Link>
    </li>
  );
}

function DataCell({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1 text-[12px] text-muted-foreground lg:block",
        className,
      )}
    >
      <span className="shrink-0 text-[11px] text-muted-foreground/60 lg:hidden">
        {label}：
      </span>
      {children}
    </div>
  );
}

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-419");
}

function formatDateTime(value: Date | null) {
  if (!value) return "Sin audiencia aún";
  const date = new Date(value);
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const min = pad2(date.getMinutes());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function pad2(value: number) {
  return value.toString().padStart(2, "0");
}

function StatusChip({ label, dot }: { label: string; dot: string }) {
  return (
    <span
      className="inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-[10.5px]"
      style={{
        background: `${dot}12`,
        borderColor: `${dot}55`,
        color: dot,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
      {label}
    </span>
  );
}
