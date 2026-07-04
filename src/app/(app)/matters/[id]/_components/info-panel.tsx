"use client";

import {
  CalendarClock,
  CircleDollarSign,
  FileText,
  Gavel,
  Landmark,
  Link2,
  MapPin,
  Pencil,
  Phone,
  Scale
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { matterCategoryKind } from "@/lib/enums";
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

function contactRoleLabels(type: string | undefined) {
  if (type && ARBITRATION_TYPES.includes(type)) {
    return { lead: "仲裁员", assistant: "仲裁秘书 / 书记员" };
  }

  if (type && EXECUTION_TYPES.includes(type)) {
    return { lead: "执行法官", assistant: "书记员" };
  }

  return { lead: "法官", assistant: "法官助理 / 书记员" };
}

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
  const causeCell = matter.cause?.name ?? matter.causeFreeText ?? "—";
  const matterNatureLabel =
    kind === "litigation" ? "案由" : kind === "project" ? "业务类型" : "顾问类型";
  const matterNatureValue =
    kind === "litigation"
      ? causeCell
      : kind === "project"
        ? matter.businessType || "—"
        : matter.counselType || "—";
  const amountLabel = kind === "counsel" ? "服务期限" : "标的";
  const amountValue = kind === "counsel" ? period(matter.serviceStart, matter.serviceEnd) : claimText;
  const contactLabels = contactRoleLabels(currentProcedure?.type);
  const agencyContacts = [
    {
      label: contactLabels.lead,
      name: dash(currentProcedure?.presidingJudge),
      contact: dash(currentProcedure?.presidingJudgeContact)
    },
    {
      label: contactLabels.assistant,
      name: dash(currentProcedure?.judgeAssistant),
      contact: dash(currentProcedure?.judgeAssistantContact)
    }
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" strokeWidth={1.8} />
            <h3 className="text-[15px] font-medium">案件信息</h3>
          </div>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground tabular">
            所内案号：{dash(matter.firmCaseNo)}
          </p>
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

      <div className="rounded-md border border-border bg-background/70 p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <InfoMetric icon={<Scale className="h-3.5 w-3.5" />} label={matterNatureLabel} value={matterNatureValue} />
          <InfoMetric
            icon={<CircleDollarSign className="h-3.5 w-3.5" />}
            label={amountLabel}
            value={amountValue}
            mono={kind !== "counsel"}
          />
          <InfoMetric
            icon={<Gavel className="h-3.5 w-3.5" />}
            label="案号"
            value={dash(currentProcedure?.caseNumber)}
            mono
          />
          <InfoMetric
            icon={<CalendarClock className="h-3.5 w-3.5" />}
            label="立案时间"
            value={currentProcedure?.acceptedAt ? formatDate(currentProcedure.acceptedAt) : "—"}
            mono
          />
          <InfoMetric
            icon={<MapPin className="h-3.5 w-3.5" />}
            label="管辖地"
            value={dash(currentProcedure?.jurisdiction)}
          />
          <InfoMetric
            icon={<Landmark className="h-3.5 w-3.5" />}
            label="管辖机构"
            value={dash(currentProcedure?.handlingAgency)}
          />
        </div>
      </div>

      <section className="rounded-md border border-border bg-background/60 p-3">
        <InfoSectionTitle icon={<Phone className="h-3.5 w-3.5" />}>
          本程序审理机构联系方式
        </InfoSectionTitle>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {agencyContacts.map((item) => (
            <ContactCard
              key={item.label}
              label={item.label}
              name={item.name}
              contact={item.contact}
            />
          ))}
        </div>
      </section>

      <section className="rounded-md border border-border bg-background/60 p-3">
        <InfoSectionTitle icon={<Link2 className="h-3.5 w-3.5" />}>
          关联案件
        </InfoSectionTitle>
        <div className="mt-3 rounded-md bg-card/70 px-3 py-2">
          <RelatedMattersField
            matterId={matter.id}
            related={relatedMatters}
            canManage={canManageRelatedMatters}
          />
        </div>
      </section>
    </section>
  );
}

/* —— Sub-components —— */

function InfoMetric({
  icon,
  label,
  value,
  mono
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-card px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div
        className={cn(
          "mt-1 min-h-[18px] break-words text-[12.5px] leading-snug text-foreground/95",
          mono && "font-mono tabular"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function InfoSectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h4 className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
      <span className="text-primary">{icon}</span>
      {children}
    </h4>
  );
}

function ContactCard({
  label,
  name,
  contact
}: {
  label: string;
  name: React.ReactNode;
  contact: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-card/70 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-2 grid grid-cols-[48px_minmax(0,1fr)] gap-x-2 gap-y-1 text-[12px] leading-relaxed">
        <span className="text-muted-foreground">姓名</span>
        <span className="min-w-0 break-words text-foreground/90">{name}</span>
        <span className="text-muted-foreground">联系</span>
        <span className="min-w-0 break-words font-mono text-foreground/90 tabular">{contact}</span>
      </div>
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
