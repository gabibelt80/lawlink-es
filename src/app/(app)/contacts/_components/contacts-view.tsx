"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookUser, Plus, Pencil, Archive, Check, XCircle } from "lucide-react";
import type {
  ExternalContactCategory,
  ExternalContactStatus,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { userRoleLabel } from "@/lib/enums";
import { ExternalContactDialog } from "./external-contact-dialog";
import {
  approveExternalContact,
  archiveExternalContact,
  rejectExternalContact,
} from "@/server/external-contacts/actions";
import { toast } from "sonner";

type ColleagueItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  avatar: string | null;
};

type ExternalContactItem = {
  id: string;
  name: string;
  category: ExternalContactCategory;
  organization: string | null;
  title: string | null;
  phone: string | null;
  email: string | null;
  wechat: string | null;
  address: string | null;
  notes: string | null;
  tags: string[];
  status: ExternalContactStatus;
  createdBy: { id: string; name: string };
  reviewedBy: { id: string; name: string } | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  createdAt: Date;
};

const EXT_CATEGORY_LABEL: Record<ExternalContactCategory, string> = {
  COURT: "Tribunal",
  PROSECUTOR: "Fiscalía",
  POLICE: "Policía",
  NOTARY: "Notaría",
  ARBITRATION: "Arbitraje",
  OTHER_FIRM: "Otra firma",
  EXPERT: "Perito",
  OTHER: "Otro",
};

export function ContactsView({
  colleagues,
  externalContacts,
  currentUserId,
  currentUserRole,
}: {
  colleagues: ColleagueItem[];
  externalContacts: ExternalContactItem[];
  currentUserId: string;
  currentUserRole: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExternalContactItem | null>(null);
  const [filter, setFilter] = useState<ExternalContactCategory | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const router = useRouter();
  const canReviewContacts =
    currentUserRole === "ADMIN" || currentUserRole === "PRINCIPAL_LAWYER";
  const pendingCount = externalContacts.filter(
    (c) => c.status === "PENDING_REVIEW",
  ).length;

  const filteredExternal = externalContacts.filter((c) => {
    if (filter !== "ALL" && c.category !== filter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hit =
        c.name.toLowerCase().includes(q) ||
        (c.organization && c.organization.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q));
      if (!hit) return false;
    }
    return true;
  });

  async function handleArchive(c: ExternalContactItem) {
    if (!confirm(`¿Archivar contacto "${c.name}"?`)) return;
    try {
      await archiveExternalContact(c.id);
      toast.success("Archivado");
      router.refresh();
    } catch (err) {
      toast.error("Error al archivar", {
        description: err instanceof Error ? err.message : "",
      });
    }
  }

  async function handleApprove(c: ExternalContactItem) {
    if (!confirm(`¿Aprobar contacto "${c.name}"? Se mostrará a toda la firma.`))
      return;
    try {
      await approveExternalContact({ id: c.id });
      toast.success("Aprobado");
      router.refresh();
    } catch (err) {
      toast.error("Error al revisar", {
        description: err instanceof Error ? err.message : "",
      });
    }
  }

  async function handleReject(c: ExternalContactItem) {
    const note = prompt(`Motivo para rechazar "${c.name}" (opcional)`);
    if (note === null) return;
    try {
      await rejectExternalContact({ id: c.id, note });
      toast.success("Rechazado");
      router.refresh();
    } catch (err) {
      toast.error("Error al revisar", {
        description: err instanceof Error ? err.message : "",
      });
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-xl">
          <BookUser className="h-5 w-5 text-primary" strokeWidth={1.8} />
          Directorio
        </h1>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Colegas de la firma y contactos externos
        </p>
      </header>

      {/* Colegas */}
      <div className="space-y-3">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-medium">
            Colegas de la firma ({colleagues.length})
          </h2>
        </header>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {colleagues.map((u) => (
            <div
              key={u.id}
              className="flex items-start gap-3 rounded-md border border-border bg-card p-3"
            >
              <Avatar className="h-10 w-10 border border-border bg-primary/10">
                {u.avatar ? <AvatarImage src={u.avatar} alt={u.name} /> : null}
                <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                  {u.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{u.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {userRoleLabel[u.role as keyof typeof userRoleLabel] ??
                    u.role}
                </div>
                <div className="mt-1 space-y-0.5 text-[11px] text-foreground/80">
                  <div className="truncate font-mono">{u.email}</div>
                  {u.phone && <div className="font-mono">{u.phone}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contactos externos */}
      <div className="space-y-3">
        <header className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            Contactos externos ({externalContacts.length})
            {canReviewContacts && pendingCount > 0 && (
              <span className="rounded-full border border-amber-300/70 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                Pendiente de revisión {pendingCount}
              </span>
            )}
          </h2>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar
          </Button>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={cn(
              "rounded-full border px-3 py-0.5 text-[11px] transition-colors",
              filter === "ALL"
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-input hover:bg-muted hover:text-foreground",
            )}
          >
            Todos
          </button>
          {(Object.keys(EXT_CATEGORY_LABEL) as ExternalContactCategory[]).map(
            (c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFilter(c)}
                className={cn(
                  "rounded-full border px-3 py-0.5 text-[11px] transition-colors",
                  filter === c
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-input hover:bg-muted hover:text-foreground",
                )}
              >
                {EXT_CATEGORY_LABEL[c]}
              </button>
            ),
          )}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nombre / institución / teléfono"
            className="ml-auto h-8 w-48 rounded-md border border-border bg-background px-3 text-xs"
          />
        </div>

        {filteredExternal.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-background py-8 text-center text-xs text-muted-foreground">
            No hay contactos coincidentes
          </p>
        ) : (
          <ul className="space-y-1.5">
            {filteredExternal.map((c) => {
              const canEdit =
                currentUserRole === "ADMIN" ||
                currentUserRole === "PRINCIPAL_LAWYER" ||
                c.createdBy.id === currentUserId;
              return (
                <li
                  key={c.id}
                  className="flex items-start gap-3 rounded-md border border-border bg-card p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {EXT_CATEGORY_LABEL[c.category]}
                      </span>
                      {c.status === "PENDING_REVIEW" && (
                        <span className="rounded-full border border-amber-300/70 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          Pendiente de revisión
                        </span>
                      )}
                      {c.title && (
                        <span className="text-[11px] text-muted-foreground">
                          {c.title}
                        </span>
                      )}
                    </div>
                    {c.organization && (
                      <div className="text-[11px] text-foreground/80">
                        {c.organization}
                      </div>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-foreground/80">
                      {c.phone && <span className="font-mono">{c.phone}</span>}
                      {c.email && <span className="font-mono">{c.email}</span>}
                      {c.wechat && <span>WeChat {c.wechat}</span>}
                    </div>
                    {c.address && (
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {c.address}
                      </div>
                    )}
                    {c.notes && (
                      <div className="mt-1 text-[11px] italic text-muted-foreground">
                        {c.notes}
                      </div>
                    )}
                    {c.status === "PENDING_REVIEW" && (
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        Enviado por: {c.createdBy.name}
                      </div>
                    )}
                  </div>
                  {(canEdit ||
                    (canReviewContacts && c.status === "PENDING_REVIEW")) && (
                    <div className="flex flex-col items-end gap-1">
                      {canReviewContacts && c.status === "PENDING_REVIEW" && (
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApprove(c)}
                            className="h-7 gap-1 px-2 text-[11px] text-emerald-600 hover:text-emerald-700"
                          >
                            <Check className="h-3 w-3" />
                            Aprobar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(c)}
                            className="h-7 gap-1 px-2 text-[11px] text-destructive"
                          >
                            <XCircle className="h-3 w-3" />
                            Rechazar
                          </Button>
                        </div>
                      )}
                      {canEdit && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(c);
                              setDialogOpen(true);
                            }}
                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-primary"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchive(c)}
                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                          >
                            <Archive className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ExternalContactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />
    </div>
  );
}
