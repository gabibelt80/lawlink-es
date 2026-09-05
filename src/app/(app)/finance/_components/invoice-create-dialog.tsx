"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  Paperclip,
  FileText,
  X,
  Receipt,
  Search,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioChips } from "@/components/ui/radio-chips";
import {
  createInvoiceRequest,
  getMatterInvoiceContext,
  searchMattersForInvoice,
} from "@/server/finance/actions";
import { uploadDocument } from "@/server/documents/actions";
import { cn } from "@/lib/utils";

type InvoiceType = "PLAIN" | "SPECIAL";
type InvoiceItem = "LAWYER_FEE" | "CONSULTING_FEE" | "AGENCY_FEE" | "OTHER";
type MatterRef = { id: string; internalCode: string; title: string };
type ClientOption = {
  id: string;
  name: string;
  taxNo: string | null;
  isPrimary: boolean;
};

const INVOICE_ITEM_OPTIONS: { value: InvoiceItem; label: string }[] = [
  { value: "LAWYER_FEE", label: "Honorarios de abogados" },
  { value: "CONSULTING_FEE", label: "Honorarios de asesoría legal" },
  { value: "AGENCY_FEE", label: "Honorarios de representación" },
  { value: "OTHER", label: "Otros servicios legales" },
];

export function InvoiceCreateDialog({
  open,
  onOpenChange,
  canCreateUnlinkedInvoice = false,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  canCreateUnlinkedInvoice?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modo de asociación
  const [noMatter, setNoMatter] = useState(false);
  const [noMatterReason, setNoMatterReason] = useState("");
  const [matterQuery, setMatterQuery] = useState("");
  const [matterResults, setMatterResults] = useState<MatterRef[]>([]);
  const [selectedMatter, setSelectedMatter] = useState<MatterRef | null>(null);
  const [matterLoading, setMatterLoading] = useState(false);
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);

  // Campos de facturación
  const [amount, setAmount] = useState("");
  const [invoiceType, setInvoiceType] = useState<InvoiceType | null>(null);
  const [invoiceItem, setInvoiceItem] = useState<InvoiceItem>("LAWYER_FEE");
  const [buyerName, setBuyerName] = useState("");
  const [buyerTaxNo, setBuyerTaxNo] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerBank, setBuyerBank] = useState("");
  const [buyerBankAccount, setBuyerBankAccount] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const matterSearchSeqRef = useRef(0);

  function reset() {
    matterSearchSeqRef.current += 1;
    setNoMatter(false);
    setNoMatterReason("");
    setMatterQuery("");
    setMatterResults([]);
    setSelectedMatter(null);
    setMatterLoading(false);
    setClientOptions([]);
    setAmount("");
    setInvoiceType(null);
    setInvoiceItem("LAWYER_FEE");
    setBuyerName("");
    setBuyerTaxNo("");
    setBuyerAddress("");
    setBuyerPhone("");
    setBuyerBank("");
    setBuyerBankAccount("");
    setRequestNote("");
    setEvidenceFiles([]);
  }

  useEffect(() => {
    if (open) {
      reset();
      loadMatterOptions("");
    }
  }, [open]);

  function loadMatterOptions(q: string) {
    const query = q.trim();
    const seq = matterSearchSeqRef.current + 1;
    matterSearchSeqRef.current = seq;
    setMatterLoading(true);

    searchMattersForInvoice(query)
      .then((items) => {
        if (matterSearchSeqRef.current === seq) setMatterResults(items);
      })
      .catch(() => {
        if (matterSearchSeqRef.current === seq) setMatterResults([]);
      })
      .finally(() => {
        if (matterSearchSeqRef.current === seq) setMatterLoading(false);
      });
  }

  function runSearch(q: string) {
    setMatterQuery(q);
    loadMatterOptions(q);
  }

  function pickMatter(m: MatterRef) {
    setSelectedMatter(m);
    setClientOptions([]);
    setBuyerName("");
    setBuyerTaxNo("");
    getMatterInvoiceContext(m.id)
      .then((ctx) => {
        setClientOptions(ctx.clientOptions);
        if (ctx.clientOptions.length === 1) {
          const only = ctx.clientOptions[0];
          setBuyerName(only.name);
          setBuyerTaxNo(only.taxNo ?? "");
        }
      })
      .catch(() => setClientOptions([]));
  }

  function pickClient(id: string) {
    const c = clientOptions.find((o) => o.id === id);
    if (c) {
      setBuyerName(c.name);
      if (c.taxNo) setBuyerTaxNo(c.taxNo);
    }
  }

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list).filter((f) => f.size <= 20 * 1024 * 1024);
    if (arr.length < list.length)
      toast.warning("Se omitieron archivos mayores a 20 MB");
    setEvidenceFiles((prev) => [...prev, ...arr]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.warning("Ingresá el monto");
    if (!noMatter && !selectedMatter)
      return toast.warning(
        "Seleccioná un caso relacionado o marcá «Sin caso relacionado»",
      );
    if (noMatter && !noMatterReason.trim())
      return toast.warning("Indicá el motivo si no hay caso relacionado");
    if (!invoiceType) return toast.warning("Seleccioná el tipo de factura");
    if (!buyerName.trim())
      return toast.warning("Ingresá el nombre del titular de la factura");
    if (invoiceType === "SPECIAL") {
      if (!buyerTaxNo.trim())
        return toast.warning(
          "La factura especial debe incluir el número de identificación fiscal",
        );
      if (!buyerAddress.trim())
        return toast.warning(
          "La factura especial debe incluir la dirección del comprador",
        );
      if (!buyerPhone.trim())
        return toast.warning(
          "La factura especial debe incluir el teléfono del comprador",
        );
      if (!buyerBank.trim())
        return toast.warning("La factura especial debe incluir el banco");
      if (!buyerBankAccount.trim())
        return toast.warning(
          "La factura especial debe incluir la cuenta bancaria",
        );
    }
    if (!noMatter && evidenceFiles.length === 0) {
      return toast.warning(
        "Adjuntá la base de la factura (contrato de mandato escaneado, etc.)",
      );
    }

    startTransition(async () => {
      try {
        const isSpecial = invoiceType === "SPECIAL";
        const docIds: string[] = [];
        // Solo se suben los respaldos cuando hay caso asociado (los respaldos deben estar vinculados a un caso)
        if (!noMatter && selectedMatter) {
          for (const file of evidenceFiles) {
            const fd = new FormData();
            fd.set("matterId", selectedMatter.id);
            fd.set("name", file.name);
            fd.set("category", "OTHER");
            fd.set("encrypted", "true");
            fd.set("tags", "Base de la factura");
            fd.set("file", file);
            const doc = await uploadDocument(fd);
            docIds.push(doc.id);
          }
        }
        await createInvoiceRequest({
          matterId: noMatter ? null : selectedMatter!.id,
          noMatterReason: noMatter ? noMatterReason : null,
          amount: amt,
          invoiceType,
          invoiceItem,
          buyerName,
          buyerTaxNo: isSpecial ? buyerTaxNo : null,
          buyerAddress: isSpecial ? buyerAddress : null,
          buyerPhone: isSpecial ? buyerPhone : null,
          buyerBank: isSpecial ? buyerBank : null,
          buyerBankAccount: isSpecial ? buyerBankAccount : null,
          evidenceDocIds: docIds,
          requestNote,
        });
        toast.success("La solicitud de factura fue enviada");
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error("Error al enviar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[92vw] max-w-xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-5 py-3">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Solicitar emisión de factura
          </DialogTitle>
          <DialogDescription className="text-xs">
            {canCreateUnlinkedInvoice
              ? "Seleccioná un caso relacionado con vos o emití una factura sin caso relacionado (debés indicar el motivo)"
              : "Seleccioná un caso relacionado con vos para enviar la solicitud de factura"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Caso relacionado */}
          <Field label="Caso relacionado" required>
            <div className="space-y-2">
              {canCreateUnlinkedInvoice && (
                <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={noMatter}
                    onChange={(e) => {
                      setNoMatter(e.target.checked);
                      if (e.target.checked) {
                        setSelectedMatter(null);
                      } else {
                        loadMatterOptions(matterQuery);
                      }
                    }}
                  />
                  Sin caso relacionado (por ejemplo, ingresos de gestión
                  interna, consultoría y otros ingresos no vinculados a un caso)
                </label>
              )}

              {canCreateUnlinkedInvoice && noMatter ? (
                <Textarea
                  rows={2}
                  placeholder="Describí el motivo específico para no tener un caso relacionado (obligatorio)"
                  value={noMatterReason}
                  onChange={(e) => setNoMatterReason(e.target.value)}
                />
              ) : selectedMatter ? (
                <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    <span className="font-mono text-muted-foreground">
                      {selectedMatter.internalCode}
                    </span>
                    <span className="truncate">{selectedMatter.title}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedMatter(null)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={matterQuery}
                      onChange={(e) => runSearch(e.target.value)}
                      placeholder="Buscar nombre del caso / código del sistema / número interno del caso"
                      className="h-8 pl-7 text-xs"
                    />
                  </div>
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {matterLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      </div>
                    ) : matterResults.length === 0 ? (
                      <p className="rounded-md border border-dashed border-border bg-background py-4 text-center text-xs text-muted-foreground">
                        {matterQuery.trim()
                          ? "No hay casos coincidentes"
                          : "No hay casos relacionados disponibles"}
                      </p>
                    ) : (
                      matterResults.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => pickMatter(m)}
                          className="flex w-full flex-col rounded-sm border border-border bg-background px-2 py-1.5 text-left text-xs transition-colors hover:border-input hover:bg-muted hover:text-foreground"
                        >
                          <span className="font-mono text-[10.5px] text-muted-foreground">
                            {m.internalCode}
                          </span>
                          <span className="truncate">{m.title}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </Field>

          {/* Monto + Tipo */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto de la factura ($)" required>
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                className="font-mono"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="Tipo de factura" required>
              <Select
                value={invoiceType ?? undefined}
                onValueChange={(v) => setInvoiceType(v as InvoiceType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLAIN">Factura ordinaria</SelectItem>
                  <SelectItem value="SPECIAL">
                    Factura especial de IVA
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Concepto de la factura" required>
            <RadioChips
              items={INVOICE_ITEM_OPTIONS}
              value={invoiceItem}
              onChange={(v) => setInvoiceItem(v as InvoiceItem)}
            />
          </Field>

          {/* Titular */}
          <Field
            label="Titular de la factura (cliente)"
            required
            hint={
              clientOptions.length > 0
                ? "Las opciones corresponden a los clientes asociados al caso seleccionado"
                : undefined
            }
          >
            {!noMatter && clientOptions.length > 0 ? (
              <Select onValueChange={pickClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná el titular de la factura" />
                </SelectTrigger>
                <SelectContent>
                  {clientOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.isPrimary ? " (cliente principal)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="Ej.: Shanghai X Tech Co., Ltd. / Juan Pérez"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
              />
            )}
          </Field>

          {/* Seis elementos de la factura especial */}
          {invoiceType === "SPECIAL" && (
            <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-3">
              <Field label="Número de identificación fiscal" required>
                <Input
                  className="font-mono"
                  value={buyerTaxNo}
                  onChange={(e) => setBuyerTaxNo(e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Banco" required>
                  <Input
                    value={buyerBank}
                    onChange={(e) => setBuyerBank(e.target.value)}
                  />
                </Field>
                <Field label="Cuenta bancaria" required>
                  <Input
                    className="font-mono"
                    value={buyerBankAccount}
                    onChange={(e) => setBuyerBankAccount(e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Dirección del comprador" required>
                  <Input
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                  />
                </Field>
                <Field label="Teléfono del comprador" required>
                  <Input
                    className="font-mono"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Respaldo: obligatorio solo cuando hay caso asociado */}
          {!noMatter && (
            <Field
              label="Base de la factura"
              required
              hint="Contrato de mandato escaneado, etc.; cada archivo ≤ 20 MB"
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  className="h-7 gap-1.5 px-2 text-[11px]"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  Agregar archivo
                </Button>
              }
            >
              <div className="space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                {evidenceFiles.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border bg-background py-3 text-center text-xs text-muted-foreground">
                    No se seleccionó ningún archivo
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {evidenceFiles.map((f, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs"
                      >
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        <span className="flex-1 truncate">{f.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setEvidenceFiles((c) => c.filter((_, j) => j !== i))
                          }
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Field>
          )}

          <Field label="Nota de la solicitud (opcional)">
            <Textarea
              rows={2}
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
            />
          </Field>
        </div>

        <DialogFooter className="border-t border-border px-5 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button onClick={submit} disabled={isPending} className="gap-1.5">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  hint,
  action,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className={cn("flex items-center gap-1 text-xs")}>
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
        {action}
      </div>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}