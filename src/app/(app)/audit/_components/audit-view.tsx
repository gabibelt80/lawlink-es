"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  X,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { triggerAuditCleanupNow } from "@/server/cron/manual-triggers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AuditListResult, AuditFilter } from "@/server/audit-list";
import { cn } from "@/lib/utils";

type Options = {
  actions: string[];
  targetTypes: string[];
  users: { id: string; name: string }[];
};

const ALL_VALUE = "__all__";

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Inicio de sesion",
  LOGOUT: "Cierre de sesion",
  LOGIN_FAILED: "Intento de login fallido",
  MATTER_VIEW: "Vio un caso",
  INTAKE_VIEW: "Vio una admision",
  INTAKE_CREATE: "Creo una admision",
  INTAKE_CONVERT: "Convirtio admision a caso",
  INTAKE_DECLINE: "Rechazo una admision",
  INTAKE_RESUBMIT: "Reenvio una admision",
  CLIENT_AUTO_CREATE: "Creo un cliente automaticamente",
  CLIENT_CREATE: "Creo un cliente",
  USER_CREATE: "Creo un usuario",
  USER_ROLE_UPDATE: "Actualizo el rol de un usuario",
  USER_PASSWORD_RESET: "Restablecio contrasena",
  USER_DEACTIVATE: "Deshabilito un usuario",
  USER_ACTIVATE: "Habilito un usuario",
  CALENDAR_TOKEN_CREATE: "Genero enlace de calendario",
  CALENDAR_TOKEN_REGENERATE: "Regenero enlace de calendario",
  ANNOUNCEMENT_CREATE: "Publico un anuncio",
  ANNOUNCEMENT_UPDATE: "Actualizo un anuncio",
  ANNOUNCEMENT_ARCHIVE: "Archivo un anuncio",
  CONFLICT_CHECK_RUN: "Ejecuto busqueda de conflictos",
  CONFLICT_CONCLUSION_SET: "Definio conclusion de conflicto",
  SEAL_REQUEST_CREATE: "Solicito un sello",
  SEAL_APPROVED: "Aprobo un sello",
  SEAL_REJECTED: "Rechazo un sello",
  SEAL_STAMPED: "Completo un sellado",
  SEAL_CANCELLED: "Cancelo un sello",
  DOCUMENT_UPLOAD: "Subio un documento",
  TASK_CREATE: "Creo una tarea",
  TASK_COMPLETE: "Completo una tarea",
  DEADLINE_CREATE: "Creo un plazo",
  HEARING_CREATE: "Creo una audiencia",
  ARCHIVE_OVERDUE_SCAN_CRON: "Escaneo automatico de vencimientos",
  FIRM_FILE_UPLOAD: "Subio un archivo del estudio",
  TEMPLATE_RENDER: "Genero un documento desde plantilla",
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  Matter: "Caso",
  Intake: "Admision",
  Client: "Cliente",
  User: "Usuario",
  Announcement: "Anuncio",
  Document: "Documento",
  ConflictCheck: "Conflicto de intereses",
  SealRequest: "Solicitud de sello",
  Task: "Tarea",
  Deadline: "Plazo",
  Hearing: "Audiencia",
  FirmFile: "Archivo del estudio",
  DocumentTemplate: "Plantilla",
  SmsMessage: "SMS judicial",
  SystemSetting: "Configuracion",
  Report: "Reporte",
};

export function AuditView({
  result,
  options,
  currentFilter,
}: {
  result: AuditListResult;
  options: Options;
  currentFilter: AuditFilter;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [cleaning, startCleaning] = useTransition();

  function handleCleanup() {
    if (
      !confirm(
        "Limpiar inmediatamente los registros de auditoria que exceden el periodo de retencion (por defecto 365 dias, configurable con la variable de entorno AUDIT_RETENTION_DAYS)? Esta accion no se puede deshacer.",
      )
    )
      return;
    startCleaning(async () => {
      try {
        const r = await triggerAuditCleanupNow();
        toast.success(
          `Limpieza completada: se conservan ${r.retentionDays} dias y se eliminan ${r.deleted} registros`,
        );
        router.refresh();
      } catch (err) {
        toast.error("Error al limpiar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  function navigate(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(sp.toString());
    next.delete("cursor");
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === "" || v === ALL_VALUE) next.delete(k);
      else next.set(k, v);
    }
    router.push(`/audit?${next.toString()}`);
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function nextPage() {
    if (!result.nextCursor) return;
    const next = new URLSearchParams(sp.toString());
    next.set("cursor", result.nextCursor);
    router.push(`/audit?${next.toString()}`);
  }

  const hasFilter =
    !!currentFilter.userId ||
    !!currentFilter.action ||
    !!currentFilter.targetType ||
    !!currentFilter.startStr ||
    !!currentFilter.endStr;

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl">
            <ShieldCheck className="h-5 w-5 text-primary" strokeWidth={1.8} />
            Auditoria
          </h1>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Registra cada accion clave de los usuarios. Por defecto se conservan 365 dias, se limpia automaticamente a las 03:00
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCleanup}
          disabled={cleaning}
          className="gap-1.5"
          title="Limpiar registros vencidos ahora"
        >
          {cleaning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          Limpiar vencidos
        </Button>
      </header>

      {/* Filtros */}
      <div className="space-y-2 rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap items-end gap-2">
          <FilterCol label="Usuario">
            <Select
              value={currentFilter.userId || ALL_VALUE}
              onValueChange={(v) =>
                navigate({ userId: v === ALL_VALUE ? undefined : v })
              }
            >
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Ver todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Ver todos</SelectItem>
                {options.users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterCol>

          <FilterCol label="Accion">
            <Select
              value={currentFilter.action || ALL_VALUE}
              onValueChange={(v) =>
                navigate({ action: v === ALL_VALUE ? undefined : v })
              }
            >
              <SelectTrigger className="h-8 w-48 text-xs">
                <SelectValue placeholder="Ver todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Ver todos</SelectItem>
                {options.actions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {ACTION_LABELS[a] ?? a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterCol>

          <FilterCol label="Tipo de objeto">
            <Select
              value={currentFilter.targetType || ALL_VALUE}
              onValueChange={(v) =>
                navigate({ targetType: v === ALL_VALUE ? undefined : v })
              }
            >
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="Ver todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Ver todos</SelectItem>
                {options.targetTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TARGET_TYPE_LABELS[t] ?? t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterCol>

          <FilterCol label="Fecha inicio">
            <Input
              type="date"
              value={currentFilter.startStr ?? ""}
              onChange={(e) => navigate({ start: e.target.value || undefined })}
              className="h-8 w-36 text-xs"
            />
          </FilterCol>

          <FilterCol label="Fecha fin">
            <Input
              type="date"
              value={currentFilter.endStr ?? ""}
              onChange={(e) => navigate({ end: e.target.value || undefined })}
              className="h-8 w-36 text-xs"
            />
          </FilterCol>

          {hasFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate({
                  userId: undefined,
                  action: undefined,
                  targetType: undefined,
                  start: undefined,
                  end: undefined,
                })
              }
              className="ml-auto h-8 gap-1"
            >
              <X className="h-3 w-3" />
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/30 text-muted-foreground">
            <tr>
              <th className="w-8 px-2 py-1.5"></th>
              <th className="w-36 px-2 py-1.5 text-left font-normal">Fecha y hora</th>
              <th className="w-24 px-2 py-1.5 text-left font-normal">Usuario</th>
              <th className="px-2 py-1.5 text-left font-normal">Accion</th>
              <th className="w-28 px-2 py-1.5 text-left font-normal">Objeto</th>
              <th className="w-32 px-2 py-1.5 text-left font-normal">ID</th>
              <th className="px-2 py-1.5 text-left font-normal">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2 py-10 text-center text-muted-foreground">
                  Sin registros de auditoria
                </td>
              </tr>
            ) : (
              result.items.flatMap((e) => {
                const hasDetail = e.detail !== null && e.detail !== undefined;
                const isOpen = expanded.has(e.id);
                const actionLabel = ACTION_LABELS[e.action] ?? e.action;
                const targetTypeLabel = e.targetType
                  ? TARGET_TYPE_LABELS[e.targetType] ?? e.targetType
                  : "—";

                const detailSummary = hasDetail
                  ? typeof e.detail === "string"
                    ? e.detail.slice(0, 60)
                    : Object.entries(e.detail as Record<string, unknown>)
                        .slice(0, 3)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(", ")
                        .slice(0, 60)
                  : "—";

                const rows = [
                  <tr key={e.id} className={cn("hover:bg-muted/20", isOpen && "bg-muted/20")}>
                    <td className="px-2 py-1.5 text-center">
                      {hasDetail && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(e.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </button>
                      )}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
                      {e.createdAt.toLocaleString("es-AR")}
                    </td>
                    <td className="px-2 py-1.5 font-medium">
                      {e.user?.name ?? "Sistema"}
                    </td>
                    <td className="px-2 py-1.5 text-foreground">{actionLabel}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{targetTypeLabel}</td>
                    <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
                      {e.targetId
                        ? e.targetId.length > 18
                          ? `${e.targetId.slice(0, 8)}…${e.targetId.slice(-6)}`
                          : e.targetId
                        : "—"}
                    </td>
                    <td className="max-w-[200px] truncate px-2 py-1.5 text-[10px] text-muted-foreground">
                      {detailSummary}
                    </td>
                  </tr>,
                ];
                if (isOpen && hasDetail) {
                  rows.push(
                    <tr key={`${e.id}-detail`}>
                      <td></td>
                      <td colSpan={6} className="px-2 pb-2 pt-0">
                        <pre className="overflow-x-auto rounded bg-muted/40 p-2 font-mono text-[10px] text-foreground">
                          {JSON.stringify(e.detail, null, 2)}
                        </pre>
                      </td>
                    </tr>,
                  );
                }
                return rows;
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Esta pagina: {result.items.length} registros</span>
        {result.nextCursor && (
          <Button size="sm" variant="outline" onClick={nextPage}>
            Pagina siguiente →
          </Button>
        )}
      </div>
    </div>
  );
}

function FilterCol({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground">{label}</label>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}