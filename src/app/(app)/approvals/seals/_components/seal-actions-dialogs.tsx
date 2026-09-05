"use client";

import { useState, useTransition } from "react";
import { Loader2, Paperclip, FileText, AlertOctagon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  approveSealRequest,
  rejectSealRequest,
  stampSealRequest,
  cancelSealRequest,
} from "@/server/seals/actions";
import { normalizeUploadedFilename } from "@/lib/filename";
import {
  type SealRequestRow,
  SEAL_STATUS_ES,
  SEAL_TYPE_ES,
} from "./seal-types";

type Action = "detail" | "approve" | "reject" | "stamp" | "cancel";

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

export function SealActionsDialogs({
  target,
  onClose,
}: {
  target: { row: SealRequestRow; action: Action };
  onClose: () => void;
}) {
  const { row, action } = target;

  if (action === "detail") {
    return <SealDetailDialog row={row} onClose={onClose} />;
  }
  if (action === "approve" || action === "reject") {
    return <ApprovalDialog row={row} action={action} onClose={onClose} />;
  }
  if (action === "stamp") {
    return <StampDialog row={row} onClose={onClose} />;
  }
  return <CancelDialog row={row} onClose={onClose} />;
}

function SealDetailDialog({
  row,
  onClose,
}: {
  row: SealRequestRow;
  onClose: () => void;
}) {
  const draftDocName = row.draftDoc
    ? normalizeUploadedFilename(row.draftDoc.name)
    : "";
  const stampedDocName = row.stampedDoc
    ? normalizeUploadedFilename(row.stampedDoc.name)
    : "";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] w-[92vw] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles de la solicitud de uso de sello</DialogTitle>
        </DialogHeader>
        <div className="min-w-0 space-y-2 rounded border border-border bg-muted/20 p-3 text-[12px]">
          <Field k="Número de serie" v={row.code} mono />
          <Field k="Estado" v={SEAL_STATUS_ES[row.status] ?? row.status} />
          <Field
            k="Tipo de sello"
            v={SEAL_TYPE_ES[row.sealType] ?? row.sealType}
          />
          <Field k="Solicitante" v={row.requestedBy.name} />
          {row.matter && (
            <Field
              k="Caso relacionado"
              v={`${row.matter.internalCode} ${row.matter.title}`}
            />
          )}
          <Field k="Título del documento" v={row.documentTitle} />
          <Field k="Motivo" v={row.purpose} />
          <Field
            k="Páginas / copias"
            v={`${row.pageCount} páginas × ${row.copies} copias`}
          />
          <Field
            k="Sello transversal"
            v={row.requireCrossPageSeal ? "Sí" : "No"}
          />
          <Field
            k="Nivel de urgencia"
            v={row.urgency === "URGENT" ? "Urgente" : "Normal"}
          />
          <Field
            k="Fecha de envío"
            v={new Date(row.requestedAt).toLocaleString("es-AR")}
          />
          {row.approvedBy && <Field k="Aprobador" v={row.approvedBy.name} />}
          {row.approvedAt && (
            <Field
              k="Fecha de aprobación"
              v={new Date(row.approvedAt).toLocaleString("es-AR")}
            />
          )}
          {row.stampedByUser && (
            <Field k="Persona que estampó" v={row.stampedByUser.name} />
          )}
          {row.stampedAt && (
            <Field
              k="Fecha de estampado"
              v={new Date(row.stampedAt).toLocaleString("es-AR")}
            />
          )}
          {row.requestNote && (
            <Field k="Nota de solicitud" v={row.requestNote} />
          )}
          {row.approveNote && (
            <Field
              k={
                row.status === "REJECTED"
                  ? "Motivo de rechazo"
                  : "Comentario de aprobación"
              }
              v={row.approveNote}
            />
          )}
          {row.draftDoc && (
            <DocumentLink
              label="Borrador para estampado"
              docId={row.draftDoc.id}
              name={draftDocName}
            />
          )}
          {row.stampedDoc && (
            <DocumentLink
              label="Archivo después del estampado"
              docId={row.stampedDoc.id}
              name={stampedDocName}
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApprovalDialog({
  row,
  action,
  onClose,
}: {
  row: SealRequestRow;
  action: "approve" | "reject";
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"approve" | "reject">(action);
  const [pending, startTransition] = useTransition();
  const draftDocName = row.draftDoc
    ? normalizeUploadedFilename(row.draftDoc.name)
    : "";

  const submit = () => {
    if (mode === "reject" && !note.trim()) {
      toast.error("Para rechazar es necesario escribir el motivo");
      return;
    }
    startTransition(async () => {
      try {
        if (mode === "approve") {
          await approveSealRequest({ id: row.id, note: note.trim() });
          toast.success("Aprobada");
        } else {
          await rejectSealRequest({ id: row.id, reason: note.trim() });
          toast.success("Rechazada");
        }
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Operación fallida");
      }
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] w-[92vw] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aprobación de solicitud de sello</DialogTitle>
        </DialogHeader>
        <div className="min-w-0 space-y-2 rounded border border-border bg-muted/20 p-3 text-[12px]">
          <Field k="N° de serie" v={row.code} mono />
          <Field k="Tipo de sello" v={SEAL_TYPE_ES[row.sealType] ?? row.sealType} />
          <Field k="Solicitante" v={row.requestedBy.name} />
          {row.matter && (
            <Field
              k="Caso relacionado"
              v={`${row.matter.internalCode} ${row.matter.title}`}
            />
          )}
          <Field k="Título del documento" v={row.documentTitle} />
          <Field k="Motivo" v={row.purpose} />
          <Field k="Páginas / copias" v={`${row.pageCount} páginas × ${row.copies} copias`} />
          {row.requireCrossPageSeal && <Field k="Sello transversal" v="Sí" />}
          {row.urgency === "URGENT" && (
            <p className="flex items-center gap-1 text-destructive">
              <AlertOctagon className="h-3 w-3" />
              Urgente
            </p>
          )}
          {row.draftDoc && (
            <a
              href={`/api/documents/${row.draftDoc.id}/download`}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 items-start gap-1 text-primary hover:underline"
              title={draftDocName}
            >
              <FileText className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="min-w-0">
                <span>Descargar borrador para estampado</span>
                <span className="block truncate text-[11px]">
                  ({draftDocName})
                </span>
              </span>
            </a>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant={mode === "approve" ? "default" : "outline"}
            onClick={() => setMode("approve")}
            className="flex-1"
          >
            Aprobar
          </Button>
          <Button
            size="sm"
            variant={mode === "reject" ? "destructive" : "outline"}
            onClick={() => setMode("reject")}
            className="flex-1"
          >
            Rechazar
          </Button>
        </div>

        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            mode === "approve" ? "Comentario de aprobación (opcional)" : "Motivo de rechazo (obligatorio)"
          }
          rows={2}
          className="mt-2 text-[12px]"
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StampDialog({
  row,
  onClose,
}: {
  row: SealRequestRow;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!file) {
      toast.error("Subí el escaneo posterior al estampado");
      return;
    }
    if (!isPdfFile(file)) {
      toast.error("Es necesario subir un archivo PDF");
      return;
    }
    const fd = new FormData();
    fd.set("id", row.id);
    fd.set("stampedDoc", file);
    startTransition(async () => {
      try {
        await stampSealRequest(fd);
        toast.success("Completado");
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al enviar");
      }
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Completar escaneo posterior al estampado</DialogTitle>
        </DialogHeader>
        <p className="text-[12px] text-muted-foreground">
          {row.code} · {SEAL_TYPE_ES[row.sealType]} · {row.documentTitle}
        </p>
        <label className="mt-3 flex cursor-pointer items-center gap-2 rounded border border-dashed border-border px-3 py-4 text-[12px] text-muted-foreground hover:bg-muted/30">
          <Paperclip className="h-3.5 w-3.5" />
          {file ? (
            <span className="flex items-center gap-1 text-foreground">
              <FileText className="h-3 w-3" />
              {file.name}
            </span>
          ) : (
            "Seleccionar archivo PDF"
          )}
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const picked = e.target.files?.[0] ?? null;
              if (picked && !isPdfFile(picked)) {
                toast.error("Es necesario subir un archivo PDF");
                e.target.value = "";
                setFile(null);
                return;
              }
              setFile(picked);
            }}
          />
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending || !file}>
            {pending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({
  row,
  onClose,
}: {
  row: SealRequestRow;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const submit = () => {
    startTransition(async () => {
      try {
        await cancelSealRequest({ id: row.id });
        toast.success("Retirada");
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al retirar");
      }
    });
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Retirar solicitud de sello</DialogTitle>
        </DialogHeader>
        <p className="text-[12px] text-muted-foreground">
          ¿Confirmar retiro de {row.code}?
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={submit} disabled={pending}>
            {pending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Confirmar retiro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <p className="flex min-w-0 items-baseline gap-2 text-[11px]">
      <span className="w-16 shrink-0 text-muted-foreground">{k}</span>
      <span
        className={
          mono
            ? "min-w-0 break-words font-mono text-foreground"
            : "min-w-0 break-words text-foreground"
        }
      >
        {v}
      </span>
    </p>
  );
}

function DocumentLink({
  label,
  docId,
  name,
}: {
  label: string;
  docId: string;
  name: string;
}) {
  return (
    <a
      href={`/api/documents/${docId}/download`}
      target="_blank"
      rel="noreferrer"
      className="flex min-w-0 items-start gap-2 text-[11px] text-primary hover:underline"
      title={name}
    >
      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
      <span className="inline-flex min-w-0 items-start gap-1">
        <FileText className="mt-0.5 h-3 w-3 shrink-0" />
        <span className="min-w-0 truncate">{name}</span>
      </span>
    </a>
  );
}
