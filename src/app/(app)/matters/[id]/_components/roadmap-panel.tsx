"use client";

import { useRouter } from "next/navigation";
import {
  FileText,
  Scale,
  Clock,
  Upload,
  Users,
  Landmark,
  CircleDollarSign,
  FolderOpen,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

type DocumentItem = Prisma.DocumentGetPayload<{
  include: {
    uploadedBy: { select: { id: true; name: true } };
    procedure: { select: { id: true; type: true; customLabel: true } };
  };
}> & {
  stageId?: string | null;
  stageName?: string | null;
};

type HearingItem = Prisma.HearingGetPayload<{
  include: {
    procedure: { select: { id: true; type: true; customLabel: true } };
  };
}>;

type DeadlineItem = Prisma.DeadlineGetPayload<{
  include: {
    procedure: { select: { id: true; type: true; customLabel: true } };
  };
}>;

type RoadmapPanelProps = {
  matter: {
    id: string;
    title: string;
    status: string;
    claimAmount: number | null;
    primaryClient: { name: string } | null;
    parties: {
      id: string;
      name: string;
      role: string;
      partyType: string;
      idNumber: string | null;
    }[];
  };
  procedures: {
    id: string;
    type: string;
    customLabel: string | null;
    caseNumber: string | null;
    handlingAgency: string | null;
    status: string;
  }[];
  documents: DocumentItem[];
  hearings: HearingItem[];
  deadlines: DeadlineItem[];
  timelineEvents: {
    id: string;
    eventType: string;
    title: string;
    occurredAt: Date;
  }[];
};

type RoadmapItem = {
  id: string;
  type: "DOCUMENT" | "HEARING" | "DEADLINE" | "EVENT";
  title: string;
  date: Date;
  status: string;
  user: string;
  detail: string;
  stageId?: string | null;
  stageName?: string | null;
};

const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  PENDING_REVIEW: "En revision",
  APPROVED: "Aprobado",
  FILED: "Archivado",
};

const MATTER_STATUS_LABELS: Record<string, string> = {
  PENDING_ACCEPTANCE: "Pendiente de aceptacion",
  IN_PROGRESS: "En progreso",
  ON_HOLD: "En pausa",
  CLOSED: "Cerrado",
  ARCHIVED: "Archivado",
};

const PARTY_ROLE_LABELS: Record<string, string> = {
  CLIENT_PARTY: "Cliente",
  OPPOSING_PARTY: "Contraparte",
  THIRD_PARTY: "Tercero",
  CO_LITIGANT: "Colitigante",
  AGENT: "Apoderado",
  WITNESS: "Testigo",
  OTHER: "Otro",
};

export function RoadmapPanel({
  matter,
  procedures,
  documents,
  hearings,
  deadlines,
  timelineEvents,
}: RoadmapPanelProps) {
  const items: RoadmapItem[] = [];

  for (const doc of documents) {
    items.push({
      id: doc.id,
      type: "DOCUMENT",
      title: doc.name,
      date: new Date(doc.createdAt),
      status: DOCUMENT_STATUS_LABELS[doc.status] ?? doc.status,
      user: doc.uploadedBy?.name ?? "Sistema",
      detail: doc.procedure?.customLabel ?? doc.procedure?.type ?? doc.category,
      stageId: doc.stageId ?? null,
      stageName: doc.procedure?.customLabel ?? doc.procedure?.type ?? null,
    });
  }

  for (const hearing of hearings) {
    items.push({
      id: hearing.id,
      type: "HEARING",
      title: hearing.title,
      date: new Date(hearing.startsAt),
      status: "Programada",
      user: "Sistema",
      detail: hearing.procedure?.customLabel ?? hearing.procedure?.type ?? "",
    });
  }

  for (const deadline of deadlines) {
    items.push({
      id: deadline.id,
      type: "DEADLINE",
      title: deadline.title,
      date: new Date(deadline.dueAt),
      status: deadline.completed ? "Completado" : "Pendiente",
      user: "Sistema",
      detail: deadline.procedure?.customLabel ?? deadline.procedure?.type ?? "",
    });
  }

  for (const event of timelineEvents) {
    items.push({
      id: event.id,
      type: "EVENT",
      title: event.title,
      date: new Date(event.occurredAt),
      status: "Registrado",
      user: "Sistema",
      detail: event.eventType,
    });
  }

  items.sort((a, b) => b.date.getTime() - a.date.getTime());

  const activeProcedure = procedures.find((p) => p.status !== "CONCLUDED") ?? procedures[0];

  return (
    <div className="space-y-4">
      {/* Header de la hoja de ruta */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold">Hoja de ruta del caso</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Estado actual, partes, procedimientos y actividad del caso
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
          {items.length} items
        </span>
      </header>

      {/* Estado actual del caso */}
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[14px] font-semibold" title={matter.title}>
              {matter.title}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              {matter.primaryClient && (
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {matter.primaryClient.name}
                </span>
              )}
              {matter.claimAmount !== null && matter.claimAmount !== undefined && (
                <span className="inline-flex items-center gap-1">
                  <CircleDollarSign className="h-3 w-3" />
                  {formatCurrency(matter.claimAmount, { compact: true })}
                </span>
              )}
            </div>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium",
              matter.status === "IN_PROGRESS" && "bg-emerald-500/10 text-emerald-700",
              matter.status === "PENDING_ACCEPTANCE" && "bg-amber-500/10 text-amber-700",
              matter.status === "ON_HOLD" && "bg-slate-400/10 text-slate-700",
              matter.status === "CLOSED" && "bg-blue-500/10 text-blue-700",
              matter.status === "ARCHIVED" && "bg-purple-500/10 text-purple-700"
            )}
          >
            {MATTER_STATUS_LABELS[matter.status] ?? matter.status}
          </span>
        </div>

        {/* Procedimiento activo */}
        {activeProcedure && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-[11px]">
            <Landmark className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">{activeProcedure.customLabel ?? activeProcedure.type}</span>
            {activeProcedure.caseNumber && (
              <span className="font-mono text-muted-foreground">
                · {activeProcedure.caseNumber}
              </span>
            )}
            {activeProcedure.handlingAgency && (
              <span className="text-muted-foreground">
                · {activeProcedure.handlingAgency}
              </span>
            )}
          </div>
        )}

        {/* Partes */}
        {matter.parties.length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {matter.parties.slice(0, 4).map((party) => (
              <div key={party.id} className="flex items-center gap-2 text-[11px]">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    party.role === "CLIENT_PARTY"
                      ? "bg-primary/10 text-primary"
                      : party.role === "OPPOSING_PARTY"
                        ? "bg-red-500/10 text-red-700"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {PARTY_ROLE_LABELS[party.role] ?? party.role}
                </span>
                <span className="truncate font-medium">{party.name}</span>
                {party.idNumber && (
                  <span className="font-mono text-muted-foreground">
                    · {party.idNumber}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Timeline */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-4 py-10 text-center">
          <FolderOpen className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            No hay actividad registrada en este caso
          </p>
        </div>
      ) : (
        <div className="relative space-y-3">
          <div className="absolute left-[19px] top-0 h-full w-px bg-border" />
          {items.map((item) => (
            <RoadmapItemCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function RoadmapItemCard({ item }: { item: RoadmapItem }) {
  const router = useRouter();
  const iconMap = {
    DOCUMENT: {
      icon: FileText,
      cls: "bg-primary/10 text-primary",
    },
    HEARING: {
      icon: Scale,
      cls: "bg-sky-500/10 text-sky-700",
    },
    DEADLINE: {
      icon: Clock,
      cls: "bg-amber-500/10 text-amber-700",
    },
    EVENT: {
      icon: Upload,
      cls: "bg-emerald-500/10 text-emerald-700",
    },
  } as const;

  const { icon: Icon, cls } = iconMap[item.type];

  return (
    <div className="relative flex gap-3 pl-[46px]">
      <div className="absolute left-0 top-1 flex h-10 w-10 items-center justify-center">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", cls)}>
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </span>
      </div>

      <div
        className={cn(
          "flex-1 rounded-lg border border-border bg-card p-3.5 transition-colors",
          item.type === "DOCUMENT" && "cursor-pointer hover:border-primary/40 hover:bg-primary/5"
        )}
        onClick={() => {
          if (item.type === "DOCUMENT") {
            const path = window.location.pathname;
            if (item.stageId) {
              router.push(`${path}?stage=${item.stageId}`);
            } else if (item.stageName) {
              router.push(`${path}?stage=${encodeURIComponent(item.stageName)}`);
            } else {
              router.push(path);
            }
          }
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[13px] font-medium">{item.title}</h3>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {item.detail}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
              item.status === "Borrador" && "bg-amber-500/10 text-amber-700",
              item.status === "En revision" && "bg-sky-500/10 text-sky-700",
              item.status === "Aprobado" && "bg-emerald-500/10 text-emerald-700",
              item.status === "Archivado" && "bg-blue-500/10 text-blue-700",
              item.status === "Pendiente" && "bg-amber-500/10 text-amber-700",
              item.status === "Completado" && "bg-emerald-500/10 text-emerald-700",
              item.status === "Programada" && "bg-sky-500/10 text-sky-700",
              item.status === "Registrado" && "bg-emerald-500/10 text-emerald-700"
            )}
          >
            {item.status}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>
            {item.date.toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </span>
          <span>·</span>
          <span>{item.date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</span>
          <span>·</span>
          <span>{item.user}</span>
        </div>
      </div>
    </div>
  );
}