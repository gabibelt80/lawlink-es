"use client";

import { useState } from "react";
import { FileText, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { litigationStandingLabel, matterCategoryKind } from "@/lib/enums";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { MatterPayload } from "./matter-detail-tabs";
import { RelatedMattersField } from "./related-matters-field";

const ARBITRATION_TYPES = [
  "COMMERCIAL_ARBITRATION",
  "LABOR_ARBITRATION",
  "ARBITRATION_SET_ASIDE",
  "ARBITRATION_ENFORCEMENT_REVIEW",
];

const EXECUTION_TYPES = [
  "ENFORCEMENT",
  "ENFORCEMENT_OBJECTION",
  "ADMIN_NON_LITIGATION_ENFORCEMENT",
  "CRIMINAL_ENFORCEMENT",
];

const dash = (v: string | null | undefined) => v?.trim() || "—";

// 商事仲裁配仲裁秘书，诉讼/劳动仲裁配书记员，不会同时出现
function contactRoleLabels(type: string | undefined) {
  if (type && ARBITRATION_TYPES.includes(type)) {
    return { lead: "Árbitro", assistant: "Secretario de arbitraje" };
  }

  if (type && EXECUTION_TYPES.includes(type)) {
    return { lead: "Juez de ejecución", assistant: "Secretario" };
  }

  return { lead: "Juez principal", assistant: "Secretario" };
}

const PROCEDURE_OUTCOME_LABEL: Record<string, string> = {
  WON: "Ganado",
  PARTIAL_WON: "Parcialmente ganado",
  LOST: "Perdido",
  MEDIATED: "Conciliado",
  WITHDRAWN: "Retirado",
  DISMISSED: "Desestimado",
  COMPLETED: "Completado",
  TRANSFERRED: "Remitido",
  OTHER: "Otro",
};

export function InfoPanel({
  matter,
  currentProcedure,
  canEdit,
  canManageRelatedMatters,
  onEdit,
}: {
  matter: MatterPayload;
  currentProcedure: MatterPayload["procedures"][number] | null;
  canEdit: boolean;
  canManageRelatedMatters: boolean;
  onEdit: () => void;
}) {
  // 关联Caso（双向合并去重）
  const relatedMatters = [
    ...matter.linksFrom.map((l) => l.relatedMatter),
    ...matter.linksTo.map((l) => l.matter),
  ].filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i);

  // v0.35: 按Caso类别分叉展示（诉讼/仲裁 vs 非诉/专ítems vs 顾问）
  const kind = matterCategoryKind(matter.category);
  const period = (s: Date | null, e: Date | null) => {
    if (!s && !e) return "—";
    return `${s ? formatDate(s) : "—"} ~ ${e ? formatDate(e) : "—"}`;
  };
  const claimText = matter.claimAmount
    ? formatCurrency(Number(matter.claimAmount))
    : "—";
  const amountLabel = kind === "counsel" ? "Plazo de servicio" : "Objeto";
  const amountValue =
    kind === "counsel"
      ? period(matter.serviceStart, matter.serviceEnd)
      : claimText;
  // v1.1「信息Total览」：只放标题区/侧栏没有的内容——Causa、类别、Estado、Plazo
  // 已由页头y MatterKeypoints 承载，此处聚焦当前程序的档案字段
  const contactLabels = contactRoleLabels(currentProcedure?.type);

  const standing = currentProcedure?.ourStanding ?? matter.ourStanding;
  const isArbitration = Boolean(
    currentProcedure && ARBITRATION_TYPES.includes(currentProcedure.type),
  );
  const requestLabel = isArbitration
    ? "Petición arbitral"
    : "Petición judicial";
  const requestContent = matter.intake?.claimDescription?.trim() || "";
  const causeText =
    matter.cause?.name?.trim() || matter.causeFreeText?.trim() || "";
  const clientName =
    matter.primaryClient?.name?.trim() ||
    matter.clientLinks.map((l) => l.client.name).join("、");
  const opposingNames = matter.parties
    .filter((p) => p.role === "OPPOSING_PARTY")
    .map((p) => p.name)
    .join("、");
  // barFiling 记录的是「是否需向律协备案」，NONE 视为未备案
  const barFilingText =
    matter.barFiling && matter.barFiling !== "NONE"
      ? "Registrado"
      : "No registrado";
  const counterclaimText = matter.intake
    ? matter.intake.counterclaim
      ? "Sí"
      : "No"
    : "";
  const outcomeText =
    currentProcedure?.outcomeNote?.trim() ||
    (currentProcedure?.outcome
      ? PROCEDURE_OUTCOME_LABEL[currentProcedure.outcome]
      : "");

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" strokeWidth={1.8} />
            <h3 className="text-[15px] font-medium">
              Vista general de la información
            </h3>
          </span>
          {matter.firmCaseNo && (
            <span className="truncate font-mono text-[11px] text-muted-foreground tabular">
              {matter.firmCaseNo}
            </span>
          )}
        </div>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="h-7 gap-1.5 px-2 text-[11px]"
          >
            <Pencil className="h-3 w-3" strokeWidth={1.8} />
            Editar
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <InfoRow>
          <Pair label="Fecha de admisión">
            <Mono>
              {matter.intakeDate ? formatDate(matter.intakeDate) : "—"}
            </Mono>
          </Pair>
          <Pair label="Fecha de radicación">
            <Mono>
              {currentProcedure?.acceptedAt
                ? formatDate(currentProcedure.acceptedAt)
                : "—"}
            </Mono>
          </Pair>
        </InfoRow>
        <InfoRow>
          <Pair label="Causa">{dash(causeText)}</Pair>
          <Pair label="N° de caso">
            <Mono>{dash(currentProcedure?.caseNumber)}</Mono>
          </Pair>
        </InfoRow>
        <InfoRow>
          <Pair label="Nombre del cliente">{dash(clientName)}</Pair>
          <Pair label="Parte contraria">{dash(opposingNames)}</Pair>
        </InfoRow>
        <InfoRow>
          <Pair label="Nuestra posición">
            {standing ? (litigationStandingLabel[standing] ?? standing) : "—"}
          </Pair>
          <Pair label={amountLabel}>
            {kind !== "counsel" ? <Mono>{amountValue}</Mono> : amountValue}
          </Pair>
        </InfoRow>
        <InfoRow>
          <Pair label="¿Tiene reconvención?">{dash(counterclaimText)}</Pair>
          <Pair label="Registro colegial">{barFilingText}</Pair>
        </InfoRow>
        <InfoRow>
          <Pair label="Jurisdicción">
            {dash(currentProcedure?.jurisdiction)}
          </Pair>
          <Pair label="Órgano jurisdiccional">
            {dash(currentProcedure?.handlingAgency)}
          </Pair>
        </InfoRow>
        <InfoRow>
          <Pair label={contactLabels.lead}>
            {personName(currentProcedure?.presidingJudge)}
          </Pair>
          <Pair label="Contacto">
            <ContactText value={currentProcedure?.presidingJudgeContact} />
          </Pair>
        </InfoRow>
        <InfoRow>
          <Pair label={contactLabels.assistant}>
            {personName(currentProcedure?.judgeAssistant)}
          </Pair>
          <Pair label="Contacto">
            <ContactText value={currentProcedure?.judgeAssistantContact} />
          </Pair>
        </InfoRow>
        {currentProcedure?.panel?.trim() && (
          <InfoRow>
            <Pair label="Tribunal colegiado">{currentProcedure.panel}</Pair>
          </InfoRow>
        )}
        {requestContent && (
          <InfoRow>
            <Pair label={requestLabel}>
              <ClampedText text={requestContent} />
            </Pair>
          </InfoRow>
        )}
        {outcomeText && (
          <InfoRow>
            <Pair label="Resultado del fallo">{outcomeText}</Pair>
          </InfoRow>
        )}
        <InfoRow>
          <Pair label="Casos relacionados">
            <RelatedMattersField
              matterId={matter.id}
              related={relatedMatters}
              canManage={canManageRelatedMatters}
            />
          </Pair>
        </InfoRow>
      </div>
    </section>
  );
}

/* —— Sub-components —— */

/** 长文本默认 4 行截断，可展开/收起（诉讼请求可能很长） */
function ClampedText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const isLong = text.length > 120 || text.split("\n").length > 4;
  return (
    <span className="block">
      <span
        className={cn(
          "block whitespace-pre-wrap break-words",
          !open && isLong && "line-clamp-4",
        )}
      >
        {text}
      </span>
      {isLong && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-0.5 text-[11px] text-primary hover:underline"
        >
          {open ? "Ocultar" : "Ver más"}
        </button>
      )}
    </span>
  );
}

/** 数字/案号/Fecha类取值统一etc.宽字体 */
function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono tabular">{children}</span>;
}

/** 人名为空时显示「未录入」 */
function personName(name?: string | null): React.ReactNode {
  const n = name?.trim();
  if (!n) return <span className="text-muted-foreground">No ingresado</span>;
  return n;
}

/** 联系方式（电话etc.）etc.宽展示，空值折叠为「—」 */
function ContactText({ value }: { value?: string | null }) {
  const v = value?.trim();
  if (!v) return <>—</>;
  return <span className="font-mono tabular">{v}</span>;
}

// 一行：移动端纵向堆叠（pair 间横线），md+ 横向排列（pair 间竖线）
export function InfoRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col divide-y divide-border border-b border-border last:border-b-0 md:flex-row md:divide-x md:divide-y-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

// 一个标签-取值对：标签灰底（暗），取值白底（亮）
export function Pair({
  label,
  grow,
  wide,
  tight,
  children,
}: {
  label: string;
  grow?: boolean;
  wide?: boolean;
  /** 只占内容宽度（值不换行），用于收案时间etc.短字段，避免撑成两行 */
  tight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0",
        tight
          ? "md:flex-none"
          : wide
            ? "md:flex-[3]"
            : grow
              ? "md:flex-[2]"
              : "md:flex-1",
      )}
    >
      <div className="w-[68px] shrink-0 border-r border-border bg-muted/50 px-2 py-2 text-[11.5px] leading-snug text-muted-foreground">
        <AlignedLabel label={label} />
      </div>
      <div
        className={cn(
          "min-w-0 flex-1 bg-card px-2.5 py-2 text-[12.5px] leading-snug text-foreground/95",
          tight ? "whitespace-nowrap" : "break-words",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function AlignedLabel({ label }: { label: string }) {
  const chars = Array.from(label);
  if (chars.length > 1 && chars.length < 4) {
    return (
      <span className="flex w-[4em] justify-between whitespace-nowrap">
        {chars.map((char, index) => (
          <span key={`${char}-${index}`}>{char}</span>
        ))}
      </span>
    );
  }

  return <span className="whitespace-nowrap">{label}</span>;
}
