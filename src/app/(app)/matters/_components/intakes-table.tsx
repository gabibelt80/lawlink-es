"use client";

import type { IntakeStatus, ConflictSeverity } from "@prisma/client";
import {
  matterCategoryLabel,
  matterCategoryColor,
  matterCategoryShort,
  intakeStatusLabel,
} from "@/lib/enums";
import { CaseListCard, CaseListHeader } from "./matters-table";

export type IntakeRow = {
  id: string;
  title: string;
  category: keyof typeof matterCategoryLabel;
  status: IntakeStatus;
  receivedAt: Date;
  client: { id: string; name: string } | null;
  cause: { id: string; name: string } | null;
  conflictChecks: {
    id: string;
    conclusion: string;
    hits: { severity: ConflictSeverity }[];
  }[];
  parties: { name: string }[];
  matter: { id: string; internalCode: string } | null;
  claimAmount?: number | null;
  ownerName?: string | null;
};

/**
 * v0.17: 待Aprobación / 待补正 收案列表 — 复用 MattersTable 的 CaseListCard 保证视觉一致
 */
export function IntakesTable({
  items,
  kind = "intake",
}: {
  items: IntakeRow[];
  kind?: "intake" | "revision";
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-card py-20 text-center">
        <div className="text-base text-muted-foreground">
          {kind === "revision"
            ? "No hay ingresos pendientes de corrección"
            : "No hay ingresos pendientes de aprobación"}
        </div>
        <div className="text-xs text-muted-foreground/70">
          {kind === "revision" ? (
            "Los ingresos rechazados en Pendiente de aprobación pueden corregir su documentación y volver a Enviar; aparecerán aquí"
          ) : (
            <>
              Haz clic en la esquina superior derecha{" "}
              <span className="text-foreground/80">Nuevo ingreso</span> para
              comenzar
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ll-surface overflow-hidden">
      <CaseListHeader detailColumnLabel="案由" />
      <ul>
        {items.map((it) => {
          const statusLabel =
            kind === "revision"
              ? "待补正"
              : (intakeStatusLabel[it.status] ?? it.status);
          const dot =
            kind === "revision"
              ? "#B45309" // orange
              : it.status === "PENDING_CONFIRMATION"
                ? "#9A6700" // amber
                : "#1E40AF"; // blue
          return (
            <CaseListCard
              key={it.id}
              href={`/intakes/${it.id}`}
              title={it.title}
              accent={matterCategoryColor[it.category]}
              status={{ label: statusLabel, dot }}
              categoryShort={matterCategoryShort[it.category]}
              intakeDate={it.receivedAt}
              firmCaseNo={it.matter?.internalCode ?? null}
              clientName={it.client?.name ?? it.parties[0]?.name ?? null}
              detailColumnLabel="案由"
              procedureLabel={it.cause?.name ?? null}
              procedureFallback="未填写案由"
              procedureValueClassName="text-[12px] text-muted-foreground"
              showProcedureDots={false}
              proceduresCount={it.matter ? 1 : 0}
              claimAmount={it.claimAmount ?? null}
              inTable
            />
          );
        })}
      </ul>
    </div>
  );
}
