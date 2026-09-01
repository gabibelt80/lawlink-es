"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Receipt,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Upload,
  Download,
  FileCheck2,
  FileText,
  X,
} from "lucide-react";
import type { InvoiceRequestStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  invoiceRequestStatusLabel,
  invoiceRequestStatusColor,
} from "@/lib/enums";
import { formatCurrency, cn } from "@/lib/utils";
import {
  approveInvoiceRequest,
  rejectInvoiceRequest,
} from "@/server/invoices/actions";
import {
  recognizeInvoiceFromImage,
  type RecognizedInvoice,
} from "@/server/ai/actions";
import type { InvoiceRequestRow } from "./finance-view";
import { matterHref } from "@/lib/matters/route";

const STATUS_TABS: { key: InvoiceRequestStatus | "ALL"; label: string }[] = [
  { key: "PENDING", label: "Pendientes" },
  { key: "ISSUED", label: "Emitidas" },
  { key: "REJECTED", label: "Rechazadas" },
  { key: "ALL", label: "Todas" },
];

const INVOICE_TYPE_LABEL = {
  PLAIN: "Factura común",
  SPECIAL: "Factura especial de IVA",
} as const;

const INVOICE_ITEM_LABEL = {
  LAWYER_FEE: "Honorarios legales",
  CONSULTING_FEE: "Honorarios de asesoría legal",
  AGENCY_FEE: "Honorarios de representación",
  OTHER: "Otros servicios legales",
} as const;

export function InvoiceManagementSection({
  requests,
  canApprove,
}: {
  requests: InvoiceRequestRow[];
  canApprove: boolean;
}) {
  const [filter, setFilter] = useState<InvoiceRequestStatus | "ALL">("PENDING");
  const [processOpen, setProcessOpen] = useState<InvoiceRequestRow | null>(
    null,
  );
  const [rejectOpen, setRejectOpen] = useState<InvoiceRequestRow | null>(null);

  const filtered = requests.filter(
    (r) => filter === "ALL" || r.status === filter,
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {STATUS_TABS.map((t) => {
          const count =
            t.key === "ALL"
              ? requests.length
              : requests.filter((r) => r.status === t.key).length;
          const active = filter === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-popover/50 hover:text-foreground",
              )}
            >
              {t.label}
              <span className="font-mono text-[10px] tabular opacity-70">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <section className="rounded-xl border border-border bg-muted/30">
        {filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            <Receipt className="mx-auto mb-2 h-5 w-5 opacity-50" />
            No hay solicitudes de facturación coincidentes
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((r) => {
              const color = invoiceRequestStatusColor[r.status];
              const Icon =
                r.status === "PENDING"
                  ? Clock
                  : r.status === "ISSUED" || r.status === "APPROVED"
                    ? CheckCircle2
                    : XCircle;
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-popover/30"
                >
                  <span
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium"
                    style={{ borderColor: `${color}50`, color }}
                  >
                    <Icon className="h-3 w-3" />
                    {invoiceRequestStatusLabel[r.status]}
                  </span>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base tabular font-semibold text-foreground">
                        {formatCurrency(Number(r.amount))}
                      </span>
                      {r.title && (
                        <span className="text-sm text-muted-foreground">
                          · {r.title}
                        </span>
                      )}
                    </div>
                    {r.matter ? (
                      <Link
                        href={matterHref(r.matter)}
                        className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                      >
                        <span className="font-mono">
                          {r.matter.internalCode}
                        </span>
                        <span>·</span>
                        <span className="truncate">{r.matter.title}</span>
                      </Link>
                    ) : (
                      <div
                        className="mt-0.5 text-xs text-amber-600"
                        title={r.noMatterReason ?? ""}
                      >
                        Sin caso asociado
                        {r.noMatterReason ? ` · ${r.noMatterReason}` : ""}
                      </div>
                    )}
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Solicitante: {r.requestedBy.name} ·{" "}
                      {new Date(r.requestedAt).toLocaleString("es-AR", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {r.requestNote && <> · Comentarios: {r.requestNote}</>}
                    </div>
                    {/* v0.42 Información de facturación (seis elementos de la factura especial para facturación directa del área financiera) */}
                    {(r.buyerName || r.invoiceType) && (
                      <div className="mt-1 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                        <div>
                          <span className="text-foreground/70">
                            {r.invoiceType
                              ? INVOICE_TYPE_LABEL[r.invoiceType]
                              : "Factura"}
                          </span>
                          {r.invoiceItem && (
                            <>
                              {" "}
                              · Concepto: {INVOICE_ITEM_LABEL[r.invoiceItem]}
                            </>
                          )}
                          {r.buyerName && <> · Razón social: {r.buyerName}</>}
                          {r.buyerTaxNo && (
                            <>
                              {" "}
                              · Número tributario:{" "}
                              <span className="font-mono">{r.buyerTaxNo}</span>
                            </>
                          )}
                        </div>
                        {r.invoiceType === "SPECIAL" &&
                          (r.buyerBank ||
                            r.buyerBankAccount ||
                            r.buyerAddress ||
                            r.buyerPhone) && (
                            <div className="mt-0.5">
                              {r.buyerAddress && (
                                <>Dirección: {r.buyerAddress}　</>
                              )}
                              {r.buyerPhone && <>Teléfono: {r.buyerPhone}　</>}
                              {r.buyerBank && <>Banco: {r.buyerBank}　</>}
                              {r.buyerBankAccount && (
                                <>
                                  Cuenta:{" "}
                                  <span className="font-mono">
                                    {r.buyerBankAccount}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                      </div>
                    )}
                    {r.evidenceDocs.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {r.evidenceDocs.map((doc) => (
                          <a
                            key={doc.id}
                            href={`/api/documents/${doc.id}/download`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex max-w-64 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            <FileText className="h-3 w-3 shrink-0" />
                            <span className="truncate">{doc.name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                    {r.processNote && (
                      <div className="mt-1 text-[11px] text-destructive/80">
                        Comentario financiero: {r.processNote}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {r.contractScan && (
                      <a
                        href={`/api/documents/${r.contractScan.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        <FileCheck2 className="h-3 w-3" />
                        Contrato histórico
                      </a>
                    )}
                    {r.invoiceFile && (
                      <a
                        href={`/api/documents/${r.invoiceFile.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/15 px-2 py-1 text-[11px] text-primary"
                      >
                        <Download className="h-3 w-3" />
                        Factura electrónica
                      </a>
                    )}
                    {canApprove && r.status === "PENDING" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejectOpen(r)}
                          className="h-7 border-destructive/40 text-destructive hover:bg-destructive/10"
                        >
                          Rechazar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setProcessOpen(r)}
                          className="h-7"
                        >
                          Procesar
                        </Button>
                      </>
                    )}
                    {canApprove && r.status === "APPROVED" && (
                      <Button
                        size="sm"
                        onClick={() => setProcessOpen(r)}
                        className="h-7"
                      >
                        Subir factura nuevamente
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {processOpen && (
        <ProcessDialog
          request={processOpen}
          open={!!processOpen}
          onOpenChange={(o) => !o && setProcessOpen(null)}
        />
      )}
      {rejectOpen && (
        <RejectDialog
          request={rejectOpen}
          open={!!rejectOpen}
          onOpenChange={(o) => !o && setRejectOpen(null)}
        />
      )}
    </div>
  );
}

function ProcessDialog({
  request,
  open,
  onOpenChange,
}: {
  request: InvoiceRequestRow;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [invoiceNo, setInvoiceNo] = useState(request.invoiceNo ?? "");
  const [recognized, setRecognized] = useState<RecognizedInvoice | null>(null);
  const [ocrPending, setOcrPending] = useState(false);
  const [isPending, startTransition] = useTransition();
  const invoiceRef = useRef<HTMLInputElement>(null);

  async function handleInvoicePick(file: File | null) {
    setInvoiceFile(file);
    setRecognized(null);
    if (!file) {
      setInvoiceNo(request.invoiceNo ?? "");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.warning(
        "El archivo de factura supera 6 MB; se seleccionó el archivo, complete el número de factura manualmente.",
      );
      return;
    }
    setOcrPending(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await recognizeInvoiceFromImage(fd);
      if (!res.ok) {
        toast.warning("No se pudo completar el reconocimiento de la factura", {
          description: res.message,
        });
        return;
      }
      setRecognized(res.data);
      if (res.data.invoiceNumber) setInvoiceNo(res.data.invoiceNumber);
      toast.success(
        res.data.invoiceNumber
          ? "Se reconoció y se completó el número de factura"
          : "Se reconoció la información de la factura",
      );
    } catch (err) {
      toast.warning("Falló el reconocimiento de la factura", {
        description: err instanceof Error ? err.message : "",
      });
    } finally {
      setOcrPending(false);
    }
  }

  function handleSubmit() {
    if (request.status === "APPROVED" && !invoiceFile && !request.invoiceFile) {
      toast.warning("Suba la factura electrónica");
      return;
    }
    if (invoiceFile && !invoiceNo.trim()) {
      toast.warning(
        "Complete el número de factura al subir la factura electrónica",
      );
      return;
    }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("requestId", request.id);
        if (note.trim()) fd.set("processNote", note.trim());
        if (invoiceFile) fd.set("invoiceFile", invoiceFile);
        if (invoiceNo.trim()) fd.set("invoiceNo", invoiceNo.trim());
        const res = await approveInvoiceRequest(fd);
        toast.success(
          res.status === "ISSUED"
            ? "Se emitió la factura electrónica"
            : "Se aprobó; pendiente de subir la factura electrónica",
        );
        onOpenChange(false);
      } catch (err) {
        toast.error("Error al procesar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Procesar solicitud de facturación
          </DialogTitle>
          <DialogDescription className="text-xs">
            {request.matter?.internalCode ?? "Sin caso asociado"} ·{" "}
            {formatCurrency(Number(request.amount))}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <RequestSummary request={request} />
          <EvidencePanel request={request} />

          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Factura electrónica</div>
                <p className="text-[11px] text-muted-foreground">
                  Al seleccionar un archivo, el sistema reconoce automáticamente
                  el número de factura, el monto, los datos del
                  vendedor/comprador, etc.; si la identificación falla, puede
                  completarse manualmente.
                </p>
              </div>
            </div>
            <FileSlot
              label="Subir factura electrónica"
              file={invoiceFile}
              existing={request.invoiceFile}
              inputRef={invoiceRef}
              accept="image/*,application/pdf"
              onPick={handleInvoicePick}
            />
            {ocrPending && (
              <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Reconociendo información de la factura...
              </div>
            )}
            {recognized && (
              <OcrPreview
                data={recognized}
                requestedAmount={Number(request.amount)}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Número de factura{" "}
              {invoiceFile && <span className="text-destructive">*</span>}
            </Label>
            <Input
              className="font-mono tabular"
              placeholder="Ej.: 24432000000123456789 (obligatorio al subir la factura electrónica)"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Comentario (opcional)</Label>
            <Textarea
              rows={2}
              placeholder="Ej.: número de factura, número tributario, etc."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="gap-1.5"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {invoiceFile
              ? "Confirmar emisión"
              : "Aprobar y esperar facturación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RequestSummary({ request }: { request: InvoiceRequestRow }) {
  return (
    <section className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
      <div className="text-sm font-medium">Información de la solicitud</div>
      <div className="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
        <FieldLine label="Solicitante" value={request.requestedBy.name} />
        <FieldLine
          label="Fecha de solicitud"
          value={new Date(request.requestedAt).toLocaleString("es-AR")}
        />
        <FieldLine
          label="Monto facturable"
          value={formatCurrency(Number(request.amount))}
        />
        <FieldLine
          label="Tipo de factura"
          value={
            request.invoiceType
              ? INVOICE_TYPE_LABEL[request.invoiceType]
              : "No informado"
          }
        />
        <FieldLine
          label="Concepto de la factura"
          value={
            request.invoiceItem
              ? INVOICE_ITEM_LABEL[request.invoiceItem]
              : "No informado"
          }
        />
        <FieldLine
          label="Razón social / titular"
          value={request.buyerName ?? "No informado"}
        />
        <FieldLine
          label="Número tributario"
          value={request.buyerTaxNo ?? "No informado"}
          mono
        />
        <FieldLine
          label="Caso asociado"
          value={
            request.matter
              ? `${request.matter.internalCode} ${request.matter.title}`
              : `Sin caso asociado${request.noMatterReason ? `: ${request.noMatterReason}` : ""}`
          }
        />
        {request.invoiceType === "SPECIAL" && (
          <>
            <FieldLine
              label="Dirección del comprador"
              value={request.buyerAddress ?? "No informado"}
            />
            <FieldLine
              label="Teléfono del comprador"
              value={request.buyerPhone ?? "No informado"}
              mono
            />
            <FieldLine
              label="Banco"
              value={request.buyerBank ?? "No informado"}
            />
            <FieldLine
              label="Cuenta bancaria"
              value={request.buyerBankAccount ?? "No informado"}
              mono
            />
          </>
        )}
      </div>
      {request.requestNote && (
        <div className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
          Comentario de la solicitud: {request.requestNote}
        </div>
      )}
    </section>
  );
}

function EvidencePanel({ request }: { request: InvoiceRequestRow }) {
  return (
    <section className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">Adjuntos de la solicitud</div>
        <span className="text-[11px] text-muted-foreground">
          {request.evidenceDocs.length} adjuntos de respaldo
        </span>
      </div>
      {request.evidenceDocs.length === 0 && !request.contractScan ? (
        <p className="rounded-md border border-dashed border-border bg-background py-3 text-center text-xs text-muted-foreground">
          No se adjuntaron respaldos para la facturación con la solicitud
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {request.evidenceDocs.map((doc) => (
            <DocLink
              key={doc.id}
              id={doc.id}
              name={doc.name}
              label="Respaldo"
            />
          ))}
          {request.contractScan && (
            <DocLink
              id={request.contractScan.id}
              name={request.contractScan.name}
              label="Contrato histórico"
            />
          )}
        </div>
      )}
    </section>
  );
}

function OcrPreview({
  data,
  requestedAmount,
}: {
  data: RecognizedInvoice;
  requestedAmount: number;
}) {
  const recognizedAmount = data.totalWithTax ?? data.totalAmount;
  const mismatch =
    typeof recognizedAmount === "number" &&
    Math.abs(recognizedAmount - requestedAmount) >= 0.01;

  return (
    <div className="rounded-md border border-border bg-background px-3 py-2 text-xs">
      <div className="mb-1 font-medium text-foreground">
        Resultado del reconocimiento
      </div>
      <div className="grid gap-x-4 gap-y-1 text-muted-foreground sm:grid-cols-2">
        {data.invoiceType && <span>Tipo: {data.invoiceType}</span>}
        {data.invoiceNumber && (
          <span>
            Número de factura:{" "}
            <span className="font-mono text-foreground/80">
              {data.invoiceNumber}
            </span>
          </span>
        )}
        {data.invoiceDate && <span>Fecha de emisión: {data.invoiceDate}</span>}
        {typeof recognizedAmount === "number" && (
          <span>
            Monto reconocido:{" "}
            <span className="font-mono text-foreground/80">
              {formatCurrency(recognizedAmount)}
            </span>
          </span>
        )}
        {typeof data.taxAmount === "number" && (
          <span>
            Impuesto:{" "}
            <span className="font-mono text-foreground/80">
              {formatCurrency(data.taxAmount)}
            </span>
          </span>
        )}
        {data.buyerName && <span>Comprador: {data.buyerName}</span>}
        {data.sellerName && <span>Vendedor: {data.sellerName}</span>}
      </div>
      {mismatch && (
        <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-300">
          El monto reconocido no coincide con el monto de la solicitud; revíselo
          antes de emitir.
        </div>
      )}
    </div>
  );
}

function FieldLine({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div
        className={cn(
          "truncate text-foreground/85",
          mono && "font-mono tabular",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function DocLink({
  id,
  name,
  label,
}: {
  id: string;
  name: string;
  label: string;
}) {
  return (
    <a
      href={`/api/documents/${id}/download`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
    >
      <Download className="h-3.5 w-3.5 shrink-0" />
      <span className="shrink-0 text-[11px]">{label}</span>
      <span className="truncate">{name}</span>
    </a>
  );
}

function FileSlot({
  label,
  file,
  existing,
  inputRef,
  accept,
  onPick,
}: {
  label: string;
  file: File | null;
  existing: { id: string; name: string } | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  accept?: string;
  onPick: (f: File | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          className="h-9 gap-1"
        >
          <Upload className="h-3.5 w-3.5" />
          {file ? "Seleccionar de nuevo" : "Seleccionar archivo"}
        </Button>
        {file && (
          <>
            <span className="flex-1 truncate text-xs">{file.name}</span>
            <button
              type="button"
              onClick={() => onPick(null)}
              className="text-destructive/70 hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {!file && existing && (
          <a
            href={`/api/documents/${existing.id}/download`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 truncate text-[11px] text-muted-foreground hover:text-foreground"
          >
            Guardado: {existing.name} (se puede volver a subir y sobrescribir)
          </a>
        )}
      </div>
    </div>
  );
}

function RejectDialog({
  request,
  open,
  onOpenChange,
}: {
  request: InvoiceRequestRow;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!reason.trim()) {
      toast.warning("Ingrese el motivo de rechazo");
      return;
    }
    startTransition(async () => {
      try {
        await rejectInvoiceRequest({ requestId: request.id, reason });
        toast.success("Se rechazó");
        onOpenChange(false);
      } catch (err) {
        toast.error("La operación falló", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rechazar solicitud de facturación</DialogTitle>
          <DialogDescription className="text-xs">
            {request.matter?.internalCode ?? "Sin caso asociado"} ·{" "}
            {formatCurrency(Number(request.amount))}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className="text-xs">Motivo de rechazo *</Label>
          <Textarea
            rows={3}
            placeholder="Ej.: el monto no coincide con el contrato / falta información de la razón social"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isPending || !reason.trim()}
          >
            {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Confirmar rechazo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
