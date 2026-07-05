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
  "ARBITRATION_ENFORCEMENT_REVIEW"
];

const EXECUTION_TYPES = [
  "ENFORCEMENT",
  "ENFORCEMENT_OBJECTION",
  "ADMIN_NON_LITIGATION_ENFORCEMENT",
  "CRIMINAL_ENFORCEMENT"
];

const dash = (v: string | null | undefined) => v?.trim() || "—";

// 商事仲裁配仲裁秘书，诉讼/劳动仲裁配书记员，不会同时出现
function contactRoleLabels(type: string | undefined) {
  if (type && ARBITRATION_TYPES.includes(type)) {
    return { lead: "仲裁员", assistant: "仲裁秘书" };
  }

  if (type && EXECUTION_TYPES.includes(type)) {
    return { lead: "执行法官", assistant: "书记员" };
  }

  return { lead: "法官", assistant: "书记员" };
}

const PROCEDURE_OUTCOME_LABEL: Record<string, string> = {
  WON: "胜诉",
  PARTIAL_WON: "部分胜诉",
  LOST: "败诉",
  MEDIATED: "调解",
  WITHDRAWN: "撤回",
  DISMISSED: "驳回",
  COMPLETED: "已完成",
  TRANSFERRED: "移送",
  OTHER: "其他"
};


export function InfoPanel({
  matter,
  currentProcedure,
  canEdit,
  canManageRelatedMatters,
  onEdit
}: {
  matter: MatterPayload;
  currentProcedure: MatterPayload["procedures"][number] | null;
  canEdit: boolean;
  canManageRelatedMatters: boolean;
  onEdit: () => void;
}) {
  // 关联案件（双向合并去重）
  const relatedMatters = [
    ...matter.linksFrom.map((l) => l.relatedMatter),
    ...matter.linksTo.map((l) => l.matter)
  ].filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i);

  // v0.35: 按案件类别分叉展示（诉讼/仲裁 vs 非诉/专项 vs 顾问）
  const kind = matterCategoryKind(matter.category);
  const period = (s: Date | null, e: Date | null) => {
    if (!s && !e) return "—";
    return `${s ? formatDate(s) : "—"} ~ ${e ? formatDate(e) : "—"}`;
  };
  const claimText = matter.claimAmount ? formatCurrency(Number(matter.claimAmount)) : "—";
  const amountLabel = kind === "counsel" ? "服务期限" : "标的";
  const amountValue = kind === "counsel" ? period(matter.serviceStart, matter.serviceEnd) : claimText;
  // v1.1「信息总览」：只放标题区/侧栏没有的内容——案由、类别、状态、期限
  // 已由页头与 MatterKeypoints 承载，此处聚焦当前程序的档案字段
  const contactLabels = contactRoleLabels(currentProcedure?.type);
  const leadContact = contactValue(
    currentProcedure?.presidingJudge,
    currentProcedure?.presidingJudgeContact
  );
  const assistantContact = contactValue(
    currentProcedure?.judgeAssistant,
    currentProcedure?.judgeAssistantContact
  );
  const jurisdictionText = [
    currentProcedure?.handlingAgency?.trim(),
    currentProcedure?.jurisdiction?.trim()
  ]
    .filter(Boolean)
    .join(" · ");

  const standing = currentProcedure?.ourStanding ?? matter.ourStanding;
  const isArbitration = Boolean(
    currentProcedure && ARBITRATION_TYPES.includes(currentProcedure.type)
  );
  const requestLabel = isArbitration ? "仲裁请求" : "诉讼请求";
  const requestContent = matter.intake?.claimDescription?.trim() || "";
  const hasCounterclaim = Boolean(matter.intake?.counterclaim);
  const outcomeText = currentProcedure?.outcomeNote?.trim()
    || (currentProcedure?.outcome ? PROCEDURE_OUTCOME_LABEL[currentProcedure.outcome] : "");

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" strokeWidth={1.8} />
            <h3 className="text-[15px] font-medium">信息总览</h3>
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
            编辑
          </Button>
        )}
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
        <DossierRow>
          <DossierCell label="案号" mono>
            {dash(currentProcedure?.caseNumber)}
          </DossierCell>
          <DossierCell label="我方地位">
            {standing ? litigationStandingLabel[standing] ?? standing : "—"}
          </DossierCell>
        </DossierRow>
        <DossierRow>
          <DossierCell label={amountLabel} mono={kind !== "counsel"}>
            {amountValue}
          </DossierCell>
          <DossierCell label="编号" mono>
            {matter.internalCode}
          </DossierCell>
        </DossierRow>
        <DossierRow>
          <DossierCell label="立案" mono>
            {currentProcedure?.acceptedAt ? formatDate(currentProcedure.acceptedAt) : "—"}
          </DossierCell>
          <DossierCell label="结案" mono>
            {currentProcedure?.concludedAt ? formatDate(currentProcedure.concludedAt) : "—"}
          </DossierCell>
        </DossierRow>
        <DossierRow full>
          <DossierCell label="管辖">{jurisdictionText || "—"}</DossierCell>
        </DossierRow>
        <DossierRow>
          <DossierCell label={contactLabels.lead}>{leadContact}</DossierCell>
          <DossierCell label={contactLabels.assistant}>{assistantContact}</DossierCell>
        </DossierRow>
        {currentProcedure?.panel?.trim() && (
          <DossierRow full>
            <DossierCell label="合议庭">{currentProcedure.panel}</DossierCell>
          </DossierRow>
        )}
        {requestContent && (
          <DossierRow full>
            <DossierCell
              label={hasCounterclaim ? `${requestLabel}※` : requestLabel}
            >
              <ClampedText text={requestContent} />
            </DossierCell>
          </DossierRow>
        )}
        {outcomeText && (
          <DossierRow full>
            <DossierCell label="裁判结果">{outcomeText}</DossierCell>
          </DossierRow>
        )}
        <DossierRow full>
          <DossierCell label="关联案件">
            <RelatedMattersField
              matterId={matter.id}
              related={relatedMatters}
              canManage={canManageRelatedMatters}
            />
          </DossierCell>
        </DossierRow>
      </div>
      {hasCounterclaim && (
        <p className="text-[10.5px] text-muted-foreground">※ 本案含反诉。</p>
      )}
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
      <span className={cn("block whitespace-pre-wrap break-words", !open && isLong && "line-clamp-4")}>
        {text}
      </span>
      {isLong && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-0.5 text-[11px] text-primary hover:underline"
        >
          {open ? "收起" : "展开全文"}
        </button>
      )}
    </span>
  );
}

/** 姓名 + 联系方式合成一格；两者皆空时折叠为「未录入」 */
function contactValue(name?: string | null, contact?: string | null): React.ReactNode {
  const n = name?.trim();
  const c = contact?.trim();
  if (!n && !c) return <span className="text-muted-foreground">未录入</span>;
  return (
    <span className="min-w-0">
      {n && <span>{n}</span>}
      {c && (
        <span className={cn("font-mono text-muted-foreground tabular", n && "ml-2")}>{c}</span>
      )}
    </span>
  );
}

function DossierRow({ full, children }: { full?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "grid items-baseline gap-x-2.5 gap-y-1.5 px-3.5 py-[7px]",
        full
          ? "grid-cols-[72px_minmax(0,1fr)]"
          : "grid-cols-[72px_minmax(0,1fr)] sm:grid-cols-[72px_minmax(0,1fr)_72px_minmax(0,1fr)]"
      )}
    >
      {children}
    </div>
  );
}

function DossierCell({
  label,
  mono,
  children
}: {
  label: string;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <span className="text-[11px] leading-[1.6] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "min-w-0 break-words text-[12.5px] leading-[1.6] text-foreground/95",
          mono && "font-mono tabular"
        )}
      >
        {children}
      </span>
    </>
  );
}

// 一行：移动端纵向堆叠（pair 间横线），md+ 横向排列（pair 间竖线）
export function InfoRow({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col divide-y divide-border border-b border-border last:border-b-0 md:flex-row md:divide-x md:divide-y-0",
        className
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
  children
}: {
  label: string;
  grow?: boolean;
  wide?: boolean;
  /** 只占内容宽度（值不换行），用于收案时间等短字段，避免撑成两行 */
  tight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0",
        tight ? "md:flex-none" : wide ? "md:flex-[3]" : grow ? "md:flex-[2]" : "md:flex-1"
      )}
    >
      <div className="w-[68px] shrink-0 border-r border-border bg-muted/50 px-2 py-2 text-[11.5px] leading-snug text-muted-foreground">
        <AlignedLabel label={label} />
      </div>
      <div
        className={cn(
          "min-w-0 flex-1 bg-card px-2.5 py-2 text-[12.5px] leading-snug text-foreground/95",
          tight ? "whitespace-nowrap" : "break-words"
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
