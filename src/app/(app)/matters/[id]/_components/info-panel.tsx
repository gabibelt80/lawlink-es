"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { matterCategoryKind } from "@/lib/enums";
import { formatDate, cn } from "@/lib/utils";
import type { MatterPayload } from "./matter-detail-tabs";
import { RelatedMattersField } from "./related-matters-field";

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
type InfoField = {
  label: string;
  value: React.ReactNode;
};

function roleLabels(type: string): { judge: string } {
  if (ARBITRATION_TYPES.includes(type)) return { judge: "首席仲裁员" };
  if (EXECUTION_TYPES.includes(type)) return { judge: "执行法官" };
  return { judge: "主审法官" };
}

function requestLabel(type: string) {
  return ARBITRATION_TYPES.includes(type) ? "仲裁请求" : "诉讼请求";
}

function outcomeText(proc: { outcome: string | null; outcomeNote: string | null }) {
  return proc.outcomeNote?.trim() || (proc.outcome ? PROCEDURE_OUTCOME_LABEL[proc.outcome] : "—");
}

export function InfoPanel({
  matter,
  currentProcedure,
  requestContent,
  canEdit,
  canManageRelatedMatters,
  onEdit
}: {
  matter: MatterPayload;
  currentProcedure: MatterPayload["procedures"][number] | null;
  requestContent?: string | null;
  canEdit: boolean;
  canManageRelatedMatters: boolean;
  onEdit: () => void;
}) {
  // 其他案件当事人（第三方 / 关联方）；相对方统一在案件程序的程序当事人中展示
  const otherParties = matter.parties
    .filter(
      (p) =>
        p.role === "THIRD_PARTY" || p.role === "OTHER"
    )
    .map((p) => ({
      id: p.id,
      label: p.role === "THIRD_PARTY" ? "第三方" : "关联方",
      name: p.name,
      idNumber:
        p.partyType !== "NATURAL_PERSON" ? p.enterpriseSocialCode : p.idNumber,
      contactName: p.contactName,
      phone: p.phone
    }));

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
  const claimCell = matter.claimAmount ? (
    <span className="font-mono tabular">¥{Number(matter.claimAmount).toLocaleString()}</span>
  ) : (
    "—"
  );
  const judge = currentProcedure ? roleLabels(currentProcedure.type).judge : "主审法官";
  const shortFields: InfoField[] = [];

  if (kind === "litigation") {
    shortFields.push({ label: "标的", value: claimCell });
  }

  if (kind === "project") {
    shortFields.push(
      { label: "业务类型", value: matter.businessType || "—" },
      { label: "项目金额", value: claimCell },
      { label: "起止时间", value: period(matter.serviceStart, matter.serviceEnd) },
      { label: "交付成果", value: matter.deliverables || "—" }
    );
  }

  if (kind === "counsel") {
    shortFields.push(
      { label: "顾问类型", value: matter.counselType || "—" },
      { label: "顾问期限", value: period(matter.serviceStart, matter.serviceEnd) }
    );
  }

  if (currentProcedure) {
    shortFields.push(
      {
        label: "立案时间",
        value: currentProcedure.acceptedAt ? formatDate(currentProcedure.acceptedAt) : "—"
      },
      {
        label: "案号",
        value: <span className="font-mono tabular">{dash(currentProcedure.caseNumber)}</span>
      },
      { label: "管辖地", value: dash(currentProcedure.jurisdiction) },
      { label: "管辖机构", value: dash(currentProcedure.handlingAgency) },
      { label: judge, value: dash(currentProcedure.presidingJudge) },
      {
        label: "联系方式",
        value: <span className="font-mono tabular">{dash(currentProcedure.presidingJudgeContact)}</span>
      },
      {
        label: "裁决时间",
        value: currentProcedure.concludedAt ? formatDate(currentProcedure.concludedAt) : "—"
      }
    );
  }

  for (const op of otherParties) {
    shortFields.push(
      { label: op.label, value: op.name || "—" },
      {
        label: "证件号码",
        value: <span className="font-mono tabular">{op.idNumber || "—"}</span>
      }
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-[13px] font-medium">案件信息</span>
          {matter.firmCaseNo ? (
            <span className="font-mono text-[11px] text-muted-foreground/70 tabular">
              所内案号：{matter.firmCaseNo}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-primary"
            >
              <Pencil className="h-3 w-3" strokeWidth={1.8} />
              编辑
            </Button>
          )}
        </div>
      </header>
      <div className="overflow-hidden">
        <ThreeColumnRows fields={shortFields} />
        {currentProcedure ? (
          <>
            <InfoRow>
              <Pair label="裁决结果" grow>{outcomeText(currentProcedure)}</Pair>
            </InfoRow>
            <InfoRow>
              <Pair label={requestLabel(currentProcedure.type)} grow>
                <span className="block whitespace-pre-wrap break-words">{dash(requestContent)}</span>
              </Pair>
            </InfoRow>
          </>
        ) : null}
        <InfoRow>
          <Pair label="关联案件" grow>
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

function ThreeColumnRows({ fields }: { fields: InfoField[] }) {
  if (fields.length === 0) return null;

  const rows: InfoField[][] = [];
  for (let index = 0; index < fields.length; index += 3) {
    rows.push(fields.slice(index, index + 3));
  }

  return (
    <>
      {rows.map((row, rowIndex) => (
        <InfoRow key={`row-${rowIndex}`}>
          {row.map((field, fieldIndex) => (
            <Pair key={`${rowIndex}-${fieldIndex}-${field.label}`} label={field.label}>
              {field.value}
            </Pair>
          ))}
          {Array.from({ length: 3 - row.length }).map((_, index) => (
            <EmptyPair key={`empty-${rowIndex}-${index}`} />
          ))}
        </InfoRow>
      ))}
    </>
  );
}

function EmptyPair() {
  return (
    <div className="hidden min-w-0 md:flex md:flex-1" aria-hidden="true">
      <div className="w-[68px] shrink-0 border-r border-border bg-muted/50 px-2 py-2" />
      <div className="min-w-0 flex-1 bg-card px-2.5 py-2" />
    </div>
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
