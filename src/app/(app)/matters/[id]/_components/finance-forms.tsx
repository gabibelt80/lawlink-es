"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Trash2,
  Paperclip,
  FileText,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioChips } from "@/components/ui/radio-chips";
import {
  billingCreateSchema,
  feeEntryCreateSchema,
  type BillingCreateInput,
  type FeeEntryCreateInput,
} from "@/server/finance/schemas";
import {
  createBilling,
  createFeeEntry,
  setCommissionPlan,
  listMatterInvoiceRequests,
} from "@/server/finance/actions";
import { uploadDocument } from "@/server/documents/actions";
import {
  recognizeInvoiceFromImage,
  type RecognizedInvoice,
} from "@/server/ai/actions";
import { userRoleLabel } from "@/lib/enums";

// ============ AddBillingSheet ============

export function AddBillingSheet({
  open,
  onOpenChange,
  matterId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  matterId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [contractFile, setContractFile] = useState<File | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BillingCreateInput>({
    resolver: zodResolver(billingCreateSchema),
    defaultValues: {
      matterId,
      title: "",
      contractAmount: 0,
      schedule: "",
      status: "ACTIVE",
    },
  });
  const billingStatus = useWatch({ control, name: "status" });

  function onSubmit(values: BillingCreateInput) {
    startTransition(async () => {
      try {
        await createBilling(values);
        if (contractFile) {
          const fd = new FormData();
          fd.set("matterId", matterId);
          fd.set("name", contractFile.name);
          fd.set("category", "CONTRACT");
          fd.set("encrypted", "true");
          fd.set("tags", `Contrato,${values.title}`);
          fd.set("file", contractFile);
          await uploadDocument(fd);
          toast.success("Contrato creado, el adjunto se almacenó cifrado");
        } else {
          toast.success("Contrato creado");
        }
        reset();
        setContractFile(null);
        onOpenChange(false);
      } catch (err) {
        toast.error("Error", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[92vw] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Nuevo contrato</DialogTitle>
          <DialogDescription className="text-xs">
            Un Caso puede tener varios contratos (por ejemplo, por etapas de
            representación). También podés cargar escaneos del contrato; después
            de cifrarlos, quedarán almacenados en la biblioteca de materiales
            del caso.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col"
        >
          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
            <Field
              label="Nombre del contrato"
              required
              error={errors.title?.message}
            >
              <Input
                placeholder="Ej.: Contrato de representación legal - etapa de primera instancia"
                {...register("title")}
              />
            </Field>

            <Field label="Monto del contrato (¥)" required>
              <Input
                type="number"
                step="0.01"
                className="font-mono tabular"
                {...register("contractAmount", { valueAsNumber: true })}
              />
            </Field>

            <Field label="Estado">
              <RadioChips
                size="sm"
                items={[
                  { value: "DRAFT", label: "Borrador" },
                  { value: "ACTIVE", label: "Vigente" },
                  { value: "CLOSED", label: "Cerrado" },
                ]}
                value={billingStatus}
                onChange={(v) =>
                  setValue("status", v as BillingCreateInput["status"])
                }
              />
            </Field>

            <Field label="Fecha de firma">
              <Input
                type="date"
                {...register("signedAt", { valueAsDate: true })}
              />
            </Field>

            <Field label="Convenio de pago por etapas">
              <Textarea
                rows={3}
                placeholder="Ej.: al firmar 30%, al presentar la demanda 30%, al entrar en vigencia la sentencia 40%"
                {...register("schedule")}
              />
            </Field>

            <Field label="Adjunto del contrato (opcional)">
              <label className="flex cursor-pointer items-center gap-2 rounded border border-dashed border-border px-3 py-3 text-[12px] text-muted-foreground hover:bg-muted/30">
                <Paperclip className="h-3.5 w-3.5" />
                {contractFile ? (
                  <span className="flex items-center gap-1 text-foreground">
                    <FileText className="h-3 w-3" />
                    {contractFile.name}
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      ({(contractFile.size / 1024).toFixed(0)} KB)
                    </span>
                  </span>
                ) : (
                  "Seleccioná PDF / DOCX, se cifrará y almacenará automáticamente al Enviar"
                )}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => setContractFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </Field>
          </div>

          <DialogFooter className="border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="gap-1.5">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============ AddFeeEntrySheet ============

export function AddFeeEntrySheet({
  open,
  onOpenChange,
  matterId,
  billings,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  matterId: string;
  billings: { id: string; title: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [invoiceRequests, setInvoiceRequests] = useState<
    Awaited<ReturnType<typeof listMatterInvoiceRequests>>
  >([]);

  useEffect(() => {
    if (!open) return;
    listMatterInvoiceRequests(matterId)
      .then(setInvoiceRequests)
      .catch(() => setInvoiceRequests([]));
  }, [open, matterId]);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<FeeEntryCreateInput>({
    resolver: zodResolver(feeEntryCreateSchema),
    defaultValues: {
      matterId,
      billingId: "",
      type: "RECEIVED",
      amount: 0,
      occurredAt: new Date(),
      invoiceNo: "",
      payerOrPayee: "",
      method: "",
      note: "",
    },
  });

  const type = useWatch({ control, name: "type" });
  const billingId = useWatch({ control, name: "billingId" });

  function onSubmit(values: FeeEntryCreateInput) {
    startTransition(async () => {
      try {
        await createFeeEntry(values);
        toast.success(
          values.type === "RECEIVED" ? "Ingreso registrado" : "Registro creado",
        );
        reset();
        onOpenChange(false);
      } catch (err) {
        toast.error("Error", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[92vw] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Nuevo registro de cobro/pago</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col"
        >
          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
            <Field label="Tipo" required>
              <RadioChips
                size="sm"
                items={[
                  { value: "RECEIVABLE", label: "Por cobrar" },
                  { value: "RECEIVED", label: "Cobrado", accent: "#16a34a" },
                  { value: "REFUND", label: "Reembolso", accent: "#dc2626" },
                  { value: "COST", label: "Costo" },
                ]}
                value={type}
                onChange={(v) =>
                  setValue("type", v as FeeEntryCreateInput["type"])
                }
              />
            </Field>

            <Field label="Monto (¥)" required error={errors.amount?.message}>
              <Input
                type="number"
                step="0.01"
                className="font-mono tabular"
                {...register("amount", { valueAsNumber: true })}
              />
            </Field>

            <Field label="Fecha de ocurrencia" required>
              <Input
                type="date"
                {...register("occurredAt", { valueAsDate: true })}
              />
            </Field>

            {billings.length > 0 && (
              <Field label="Contrato relacionado">
                <Select
                  value={billingId || "none"}
                  onValueChange={(v) =>
                    setValue("billingId", v === "none" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No asociar</SelectItem>
                    {billings.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <Field label="Pagador / beneficiario">
              <Input
                placeholder="Ej.: Constructora del Norte S.A."
                {...register("payerOrPayee")}
              />
            </Field>

            <Field label="Forma">
              <Input
                placeholder="Transferencia / efectivo / Alipay"
                {...register("method")}
              />
            </Field>

            {invoiceRequests.length > 0 && (
              <Field
                label="Factura solicitada asociada"
                hint="Al seleccionarla, se completa automáticamente el monto; si ya fue emitida, se completa el número real; si no, se usa la referencia req:xxxxxxxx"
              >
                <Select
                  value="none"
                  onValueChange={(v) => {
                    if (v === "none") return;
                    const req = invoiceRequests.find((r) => r.id === v);
                    if (!req) return;
                    setValue("amount", Number(req.amount), {
                      shouldDirty: true,
                    });
                    const invoiceNoValue =
                      req.invoiceNo ?? `req:${req.id.slice(0, 8)}`;
                    setValue("invoiceNo", invoiceNoValue, {
                      shouldDirty: true,
                    });
                    const existing = getValues("note") ?? "";
                    const noteText = req.invoiceNo
                      ? `Factura solicitada asociada #${req.id.slice(0, 8)}${req.title ? "（" + req.title + "）" : ""}`
                      : `Factura solicitada asociada (sin emitir) #${req.id.slice(0, 8)}${req.title ? "（" + req.title + "）" : ""}`;
                    setValue(
                      "note",
                      existing ? `${existing}\n${noteText}` : noteText,
                      {
                        shouldDirty: true,
                      },
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar de facturas solicitadas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No asociar</SelectItem>
                    {invoiceRequests.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        ${Number(r.amount).toLocaleString()} ·{" "}
                        {r.title ?? "Sin nombre"} ·{" "}
                        {r.invoiceNo ? `Emitida ${r.invoiceNo}` : r.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <Field label="Número de factura">
              <Input className="font-mono" {...register("invoiceNo")} />
            </Field>

            <InvoiceOcrBlock
              onRecognized={(data) => {
                if (data.invoiceNumber)
                  setValue("invoiceNo", data.invoiceNumber, {
                    shouldDirty: true,
                  });
                if (data.totalWithTax || data.totalAmount) {
                  setValue(
                    "amount",
                    Number(data.totalWithTax ?? data.totalAmount),
                    {
                      shouldDirty: true,
                    },
                  );
                }
                if (data.sellerName)
                  setValue("payerOrPayee", data.sellerName, {
                    shouldDirty: true,
                  });
                if (data.invoiceDate) {
                  const d = new Date(data.invoiceDate);
                  if (!isNaN(d.getTime()))
                    setValue("occurredAt", d, { shouldDirty: true });
                }
              }}
            />

            <Field label="Observaciones">
              <Textarea rows={2} {...register("note")} />
            </Field>
          </div>

          <DialogFooter className="border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="gap-1.5">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {type === "RECEIVED" ? "Registrar cobro" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============ EditCommissionPlanDialog ============

type PlanRow = { userId: string; percent: number; label: string };

export function EditCommissionPlanDialog({
  open,
  onOpenChange,
  matterId,
  userOptions,
  initialPlans,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  matterId: string;
  userOptions: { id: string; name: string; role: string }[];
  initialPlans: PlanRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const [plans, setPlans] = useState<PlanRow[]>(initialPlans);

  function addRow() {
    const available = userOptions.find(
      (u) => !plans.some((p) => p.userId === u.id),
    );
    if (available) {
      setPlans([...plans, { userId: available.id, percent: 0, label: "" }]);
    } else {
      toast.warning("Ya se asignó participación a todos los usuarios");
    }
  }

  function removeRow(idx: number) {
    setPlans(plans.filter((_, i) => i !== idx));
  }

  function updateRow(idx: number, patch: Partial<PlanRow>) {
    setPlans(plans.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  const total = plans.reduce((acc, p) => acc + p.percent, 0);

  function handleSave() {
    if (total > 100) {
      toast.error("El total de la participación no puede superar el 100%");
      return;
    }
    startTransition(async () => {
      try {
        await setCommissionPlan({ matterId, items: plans });
        toast.success("Plan de participación guardado");
        onOpenChange(false);
      } catch (err) {
        toast.error("Error al guardar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Plan de participación</DialogTitle>
          <p className="text-xs text-muted-foreground">
            El porcentaje no especificado queda retenido por el estudio. Al
            cobrar, se generan automáticamente los items de participación según
            este plan.
          </p>
        </DialogHeader>

        <div className="space-y-2">
          {plans.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-background py-6 text-center text-xs text-muted-foreground">
              No se configuró participación
            </p>
          ) : (
            plans.map((p, idx) => {
              return (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 rounded-lg border border-border bg-background p-3"
                >
                  <div className="col-span-4">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Usuario
                    </Label>
                    <Select
                      value={p.userId}
                      onValueChange={(v) => updateRow(idx, { userId: v })}
                    >
                      <SelectTrigger className="mt-1 h-9 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {userOptions.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name} ·{" "}
                            {userRoleLabel[
                              u.role as keyof typeof userRoleLabel
                            ] ?? u.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Porcentaje
                    </Label>
                    <Input
                      type="number"
                      step="0.5"
                      min={0}
                      max={100}
                      value={p.percent}
                      onChange={(e) =>
                        updateRow(idx, { percent: Number(e.target.value) || 0 })
                      }
                      className="mt-1 h-9 bg-background font-mono tabular"
                    />
                  </div>
                  <div className="col-span-4">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Etiqueta
                    </Label>
                    <Input
                      value={p.label}
                      onChange={(e) =>
                        updateRow(idx, { label: e.target.value })
                      }
                      placeholder="Abogado principal / recomendador / socio"
                      className="mt-1 h-9 bg-background"
                    />
                  </div>
                  <div className="col-span-1 flex items-end justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(idx)}
                      className="h-9 w-9 p-0 text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addRow}
            className="h-7 gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar
          </Button>
          <div className="flex items-center gap-4 text-xs">
            <div>
              Total de beneficiarios:
              <span className="ml-1 font-mono tabular text-foreground">
                {total.toFixed(1)}%
              </span>
            </div>
            <div>
              Retención del estudio:
              <span className="ml-1 font-mono tabular text-muted-foreground">
                {Math.max(0, 100 - total).toFixed(1)}%
              </span>
            </div>
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
          <Button onClick={handleSave} disabled={isPending} className="gap-1.5">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Invoice OCR ============

function InvoiceOcrBlock({
  onRecognized,
}: {
  onRecognized: (data: RecognizedInvoice) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<RecognizedInvoice | null>(null);

  const recognize = async () => {
    if (!file) {
      toast.warning("Primero seleccioná una imagen de factura");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await recognizeInvoiceFromImage(fd);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setPreview(res.data);
      onRecognized(res.data);
      toast.success("Reconocido y completado automáticamente");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al reconocer");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5 rounded-md border border-dashed border-border bg-muted/20 p-3">
      <Label className="flex items-center gap-1.5 text-xs">
        <Sparkles className="h-3 w-3 text-primary" />
        Reconocimiento de factura con IA (opcional)
      </Label>
      <p className="text-[11px] text-muted-foreground">
        Subí una factura de IVA (JPG / PNG / PDF); tras reconocerla, se
        completará automáticamente el número de factura, el monto, el vendedor y
        la fecha de emisión.
      </p>
      <div className="flex items-center gap-2">
        <label className="flex flex-1 cursor-pointer items-center gap-2 rounded border border-border bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-muted/30">
          <Paperclip className="h-3 w-3" />
          {file ? (
            <span className="flex items-center gap-1 text-foreground">
              <FileText className="h-3 w-3" />
              {file.name}
            </span>
          ) : (
            "Seleccionar factura (JPG / PNG / PDF)"
          )}
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPreview(null);
            }}
          />
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={recognize}
          disabled={!file || busy}
          className="h-8 gap-1 text-[11px]"
        >
          {busy && <Loader2 className="h-3 w-3 animate-spin" />}
          Reconocer
        </Button>
      </div>
      {preview && (
        <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 rounded border border-border bg-background p-2 text-[10.5px] text-muted-foreground">
          {preview.invoiceType && <div>Tipo: {preview.invoiceType}</div>}
          {preview.invoiceNumber && (
            <div>
              Número de factura:{" "}
              <span className="font-mono text-foreground/85">
                {preview.invoiceNumber}
              </span>
            </div>
          )}
          {preview.invoiceDate && (
            <div>Fecha de emisión: {preview.invoiceDate}</div>
          )}
          {preview.sellerName && <div>Vendedor: {preview.sellerName}</div>}
          {preview.buyerName && <div>Comprador: {preview.buyerName}</div>}
          {preview.totalWithTax != null && (
            <div>
              Total con impuestos:
              <span className="font-mono text-foreground/85">
                ${preview.totalWithTax}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============ Shared Field ============

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1 text-xs">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && !error && (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
