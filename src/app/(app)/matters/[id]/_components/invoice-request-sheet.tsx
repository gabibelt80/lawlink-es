"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Paperclip, FileText, X, Receipt } from "lucide-react";
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
} from "@/server/finance/actions";
import { uploadDocument } from "@/server/documents/actions";
import { cn } from "@/lib/utils";

type InvoiceType = "PLAIN" | "SPECIAL";
type InvoiceItem = "LAWYER_FEE" | "CONSULTING_FEE" | "AGENCY_FEE" | "OTHER";

const INVOICE_ITEM_OPTIONS: { value: InvoiceItem; label: string }[] = [
  { value: "LAWYER_FEE", label: "Abogado服务费" },
  { value: "CONSULTING_FEE", label: "法律咨询费" },
  { value: "AGENCY_FEE", label: "代理费" },
  { value: "OTHER", label: "其他法律服务" },
];

export function InvoiceRequestSheet({
  open,
  onOpenChange,
  matterId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  matterId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [ctxLoading, setCtxLoading] = useState(true);
  const [ctx, setCtx] = useState<Awaited<
    ReturnType<typeof getMatterInvoiceContext>
  > | null>(null);

  // 表单Estado
  const [amount, setAmount] = useState<string>("");
  // v0.42 ítems5：开票类型无默认值，必须主动选择一次
  const [invoiceType, setInvoiceType] = useState<InvoiceType | null>(null);
  const [invoiceItem, setInvoiceItem] = useState<InvoiceItem>("LAWYER_FEE");
  // v0.42 ítems3：开票抬头改下拉（本案Cliente）
  const [buyerClientId, setBuyerClientId] = useState<string>("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerTaxNo, setBuyerTaxNo] = useState("");
  // v0.42 ítems4：专票购方六要素
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerBank, setBuyerBank] = useState("");
  const [buyerBankAccount, setBuyerBankAccount] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // 拉取Caso上下文 + Restablecer表单
  useEffect(() => {
    if (!open) return;
    setCtxLoading(true);
    getMatterInvoiceContext(matterId)
      .then((data) => {
        setCtx(data);
        // 只有一个Cliente时默认选中，多Cliente强制选择
        if (data.clientOptions.length === 1) {
          const only = data.clientOptions[0];
          setBuyerClientId(only.id);
          setBuyerName(only.name);
          setBuyerTaxNo(only.taxNo ?? "");
        }
      })
      .catch(() => setCtx(null));
    setCtxLoading(false);
    setAmount("");
    setInvoiceType(null);
    setInvoiceItem("LAWYER_FEE");
    setBuyerClientId("");
    setBuyerName("");
    setBuyerTaxNo("");
    setBuyerAddress("");
    setBuyerPhone("");
    setBuyerBank("");
    setBuyerBankAccount("");
    setRequestNote("");
    setEvidenceFiles([]);
  }, [open, matterId]);

  function handlePickClient(id: string) {
    setBuyerClientId(id);
    const c = ctx?.clientOptions.find((o) => o.id === id);
    if (c) {
      setBuyerName(c.name);
      // 选中Cliente时预填税号（专票可直接复用，Abogado可改）
      if (c.taxNo) setBuyerTaxNo(c.taxNo);
    }
  }

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list).filter((f) => f.size <= 20 * 1024 * 1024);
    if (arr.length < list.length)
      toast.warning("Se omitieron los archivos de más de 20 MB");
    setEvidenceFiles((prev) => [...prev, ...arr]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit() {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.warning("Ingresá el monto");
      return;
    }
    if (!invoiceType) {
      toast.warning("Seleccioná el tipo de factura");
      return;
    }
    if (!buyerName.trim()) {
      toast.warning("Seleccioná el titular de la factura");
      return;
    }
    if (invoiceType === "SPECIAL") {
      if (!buyerTaxNo.trim()) {
        toast.warning(
          "La factura de IVA debe incluir el número de identificación tributaria",
        );
        return;
      }
      if (!buyerAddress.trim()) {
        toast.warning(
          "La factura de IVA debe incluir la dirección del comprador",
        );
        return;
      }
      if (!buyerPhone.trim()) {
        toast.warning(
          "La factura de IVA debe incluir el teléfono del comprador",
        );
        return;
      }
      if (!buyerBank.trim()) {
        toast.warning("La factura de IVA debe incluir el banco del comprador");
        return;
      }
      if (!buyerBankAccount.trim()) {
        toast.warning(
          "La factura de IVA debe incluir la cuenta bancaria del comprador",
        );
        return;
      }
    }
    if (evidenceFiles.length === 0) {
      toast.warning(
        "Subí el respaldo de la factura (por ejemplo, el contrato de mandato escaneado)",
      );
      return;
    }

    startTransition(async () => {
      try {
        // 1. 上传开票依据，拿到 docId
        const docIds: string[] = [];
        for (const file of evidenceFiles) {
          const fd = new FormData();
          fd.set("matterId", matterId);
          fd.set("name", file.name);
          fd.set("category", "OTHER");
          fd.set("encrypted", "true");
          fd.set("tags", "开票依据");
          fd.set("file", file);
          const doc = await uploadDocument(fd);
          docIds.push(doc.id);
        }

        // 2. Crear开票申请
        const isSpecial = invoiceType === "SPECIAL";
        await createInvoiceRequest({
          matterId,
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
      } catch (err) {
        toast.error("Error al enviar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  const clientOptions = ctx?.clientOptions ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[92vw] max-w-xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-5 py-3">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Solicitar factura
          </DialogTitle>
          <DialogDescription className="text-xs">
            {ctxLoading
              ? "Cargando la información del caso..."
              : ctx
                ? `Caso: ${ctx.matterTitle}${ctx.intake ? " (con aprobación de admisión asociada)" : ""}`
                : "No se pudo cargar la información del caso"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* v0.42 ítems5：Monto + 开票类型 同一行 */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto de la factura (pesos)" required>
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
                  <SelectValue placeholder="Seleccioná una opción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLAIN">Factura común</SelectItem>
                  <SelectItem value="SPECIAL">
                    Factura especial de IVA
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* 开票名目 */}
          <Field label="Concepto de la factura" required>
            <RadioChips
              items={INVOICE_ITEM_OPTIONS}
              value={invoiceItem}
              onChange={(v) => setInvoiceItem(v as InvoiceItem)}
            />
          </Field>

          {/* v0.42 ítems3：Cliente抬头下拉（本案Cliente） */}
          <Field
            label="Titular de la factura (cliente)"
            required
            hint={
              clientOptions.length === 0
                ? "Este caso no tiene clientes asociados. Primero registrá un cliente entre las partes del caso"
                : "Seleccioná un cliente asociado a este caso"
            }
          >
            {clientOptions.length > 0 ? (
              <Select value={buyerClientId} onValueChange={handlePickClient}>
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
                placeholder="Por ejemplo: Empresa XYZ / Juan Pérez"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
              />
            )}
          </Field>

          {/* 专票购方六要素（v0.42 ítems4，税法合规） */}
          {invoiceType === "SPECIAL" && (
            <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-3">
              <Field
                label="Número de identificación tributaria (código fiscal unificado)"
                required
              >
                <Input
                  className="font-mono"
                  placeholder="91310000XXXXXXXXXX"
                  value={buyerTaxNo}
                  onChange={(e) => setBuyerTaxNo(e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="开户银行" required>
                  <Input
                    placeholder="Por ejemplo: Banco Nación, sucursal Centro"
                    value={buyerBank}
                    onChange={(e) => setBuyerBank(e.target.value)}
                  />
                </Field>
                <Field label="银行账号" required>
                  <Input
                    className="font-mono"
                    placeholder="62XXXXXXXXXXXXXXXX"
                    value={buyerBankAccount}
                    onChange={(e) => setBuyerBankAccount(e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Dirección del comprador" required>
                  <Input
                    placeholder="Dirección registrada en la licencia comercial"
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                  />
                </Field>
                <Field label="Teléfono del comprador" required>
                  <Input
                    className="font-mono"
                    placeholder="011-XXXXXXXX"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* 开票依据 */}
          <Field
            label="Respaldo de la factura"
            required
            hint="En condiciones normales, subí el contrato de mandato escaneado. El comprobante de pago es opcional; en casos especiales, enviá una explicación. Cada archivo debe pesar ≤ 20 MB"
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="h-7 gap-1.5 px-2 text-[11px]"
              >
                <Paperclip className="h-3.5 w-3.5" />
                Adjuntar archivo
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
                  No seleccionaste ningún archivo
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
                      <span className="font-mono text-[10px] text-muted-foreground tabular">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setEvidenceFiles((c) => c.filter((_, j) => j !== i))
                        }
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Quitar"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Field>

          {/* 申请Observaciones */}
          <Field label="Observaciones de la solicitud (opcional)">
            <Textarea
              rows={2}
              placeholder="Por ejemplo: emitila cuanto antes, el cliente la necesita"
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
          <Button
            onClick={submit}
            disabled={isPending || ctxLoading}
            className="gap-1.5"
          >
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
