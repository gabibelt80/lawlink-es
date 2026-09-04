"use client";

import { useTransition, useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ExternalLink, Loader2, Scale, ScanText } from "lucide-react";
import type { MatterCategory, ProcedureType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  procedureCreateSchema,
  deadlineCreateSchema,
  hearingCreateSchema,
  type ProcedureCreateInput,
  type DeadlineCreateInput,
  type HearingCreateInput
} from "@/server/procedures/schemas";
import {
  addProcedure,
  addDeadline,
  addHearing
} from "@/server/procedures/actions";
import { parseSummons } from "@/server/ai/parse-summons";
import { listDeadlineRulesForProcedure } from "@/server/deadline-rules/actions";
import {
  buildDeadlineBasis,
  computeDeadlineDate,
  formatLocalDate,
  periodLabel,
  HOLIDAY_NOTE
} from "@/lib/deadline-rules";
import { procedureTypeLabel } from "@/lib/enums";
import { proceduresByCategory } from "@/lib/procedures-by-category";
import {
  agencyOptionsForProcedure,
  isAgencyAllowedForProcedure,
  isNationalAgency
} from "@/lib/china-regions";
import { JurisdictionSelect } from "@/app/(app)/intakes/_components/jurisdiction-select";
import { cn } from "@/lib/utils";

// ============ AddProcedureSheet ============

const CN_NUM: Record<number, string> = {
  1: "I",
  2: "II",
  3: "III",
  4: "IV",
  5: "V",
  6: "VI",
  7: "VII",
  8: "VIII",
  9: "IX",
  10: "X"
};

export function AddProcedureSheet({
  open,
  onOpenChange,
  matterId,
  category,
  nextOrder,
  colleagues,
  existingTypes
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  matterId: string;
  category: MatterCategory;
  nextOrder: number;
  colleagues?: { id: string; name: string }[];
  /** Tipos de procedimiento ya existentes, para evitar duplicados */
  existingTypes?: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const allOptions = proceduresByCategory[category];
  const existingSet = new Set(existingTypes ?? []);
  const procedureOptions = allOptions.filter(p => !existingSet.has(p));

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    reset,
    formState: { errors }
  } = useForm<ProcedureCreateInput>({
    resolver: zodResolver(procedureCreateSchema),
    defaultValues: {
      matterId,
      type: procedureOptions[0],
      customLabel: "",
      engagement: "ENGAGED",
      caseNumber: "",
      handlingAgency: "",
      panel: "",
      handler: "",
      acceptedAt: undefined,
      jurisdiction: "",
      leadLawyerId: null,
      isExternalLead: false
    }
  });

  const procedureType = useWatch({ control, name: "type" });
  const leadLawyerId = useWatch({ control, name: "leadLawyerId" });
  const isExternalLead = useWatch({ control, name: "isExternalLead" });
  const jurisdiction = useWatch({ control, name: "jurisdiction" }) ?? "";
  const handlingAgency = useWatch({ control, name: "handlingAgency" }) ?? "";
  const agencyOpts = useMemo(
    () => agencyOptionsForProcedure(jurisdiction, procedureType),
    [jurisdiction, procedureType]
  );

  function handleProcedureTypeChange(p: ProcedureType) {
    setValue("type", p);
    // El organismo se puede escribir libremente, solo se limpia cuando es invalido para el nuevo procedimiento
    const cur = getValues("handlingAgency");
    if (cur && !isAgencyAllowedForProcedure(cur, p)) {
      setValue("handlingAgency", "");
    }
  }

  function handleJurisdictionChange(v: string) {
    setValue("jurisdiction", v);
    const cur = getValues("handlingAgency");
    if (isNationalAgency(cur)) {
      setValue("handlingAgency", "");
    } else if (cur && !agencyOptionsForProcedure(v, getValues("type")).includes(cur)) {
      setValue("handlingAgency", "");
    }
  }

  function handleHandlingAgencyChange(v: string) {
    setValue("handlingAgency", v);
    if (isNationalAgency(v)) {
      setValue("jurisdiction", "");
    }
  }

  function onSubmit(values: ProcedureCreateInput) {
    startTransition(async () => {
      try {
        await addProcedure(values);
        toast.success(`Procedimiento agregado (${procedureTypeLabel[values.type]})`);
        reset();
        onOpenChange(false);
      } catch (err) {
        toast.error("Error al agregar", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Agregar procedimiento (N° {nextOrder})</DialogTitle>
          <DialogDescription className="text-xs">
            Complete la informacion basica del procedimiento y el abogado titular
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {/* Tipo de procedimiento */}
            <div className="space-y-2">
              <Label className="text-xs">Tipo de procedimiento *</Label>
              <div className="flex flex-wrap gap-1.5">
                {procedureOptions.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleProcedureTypeChange(p as ProcedureType)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs transition-colors",
                      procedureType === p
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-input hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {procedureTypeLabel[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* Abogado titular */}
            {colleagues && colleagues.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Abogado titular</Label>
                <div className="flex items-center gap-3">
                  <Select
                    value={isExternalLead ? "__external__" : (leadLawyerId ?? "__none__")}
                    onValueChange={(v) => {
                      if (v === "__external__") {
                        setValue("isExternalLead", true);
                        setValue("leadLawyerId", null);
                      } else if (v === "__none__") {
                        setValue("isExternalLead", false);
                        setValue("leadLawyerId", null);
                      } else {
                        setValue("isExternalLead", false);
                        setValue("leadLawyerId", v);
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Seleccionar abogado titular" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin asignar</SelectItem>
                      {colleagues.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                      <SelectItem value="__external__">Representacion externa</SelectItem>
                    </SelectContent>
                  </Select>
                  {isExternalLead && (
                    <span className="text-xs text-muted-foreground">Este procedimiento lo lleva un abogado externo</span>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Numero de expediente">
                <Input
                  className="font-mono"
                  placeholder="Ej: 1288/2026"
                  {...register("caseNumber")}
                />
              </Field>
              <Field label="Jurisdiccion">
                <JurisdictionSelect
                  value={jurisdiction}
                  onChange={handleJurisdictionChange}
                />
              </Field>
              <Field label="Organismo">
                <Select
                  value={handlingAgency}
                  onValueChange={handleHandlingAgencyChange}
                  disabled={agencyOpts.length === 0}
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="Seleccionar organismo" />
                  </SelectTrigger>
                  <SelectContent>
                    {agencyOpts.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Juez / Arbitro a cargo">
                <Input {...register("handler")} />
              </Field>
              <Field label="Sala / Tribunal">
                <Input {...register("panel")} />
              </Field>
              <Field
                label="Fecha de inicio"
                error={errors.acceptedAt?.message as string | undefined}
              >
                <Input
                  type="date"
                  {...register("acceptedAt")}
                  onChange={(e) => {
                    const v = e.target.value;
                    setValue("acceptedAt", v ? new Date(v) : undefined, { shouldValidate: true });
                  }}
                />
              </Field>
            </div>
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
              Agregar procedimiento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============ AddDeadlineSheet ============

const deadlineCategoryLabel: Record<
  DeadlineCreateInput["category"],
  string
> = {
  LIMITATION: "Prescripcion",
  EVIDENCE: "Plazo de prueba",
  APPEAL: "Plazo de apelacion",
  PERFORMANCE: "Plazo de cumplimiento",
  RESPONSE: "Plazo de contestacion",
  ENFORCEMENT: "Ejecucion de sentencia",
  ARBITRATION_SET_ASIDE: "Nulidad de laudo",
  PRESERVATION: "Plazo de medida cautelar",
  CUSTOM: "Otro"
};

export function AddDeadlineDialog({
  open,
  onOpenChange,
  procedures,
  defaultProcedureId
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** v0.45: Recordatorios agregados por caso, el nuevo plazo debe indicar el procedimiento */
  procedures: { id: string; label: string }[];
  defaultProcedureId: string;
}) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors }
  } = useForm<DeadlineCreateInput>({
    resolver: zodResolver(deadlineCreateSchema),
    defaultValues: {
      procedureId: defaultProcedureId,
      title: "",
      category: "CUSTOM",
      dueAt: new Date(),
      basis: "",
      remindDays: 3
    }
  });
  const procedureId = useWatch({ control, name: "procedureId" });
  const category = useWatch({ control, name: "category" });

  // v0.49: Reglas de plazos legales (filtradas por tipo de procedimiento + categoria del caso)
  type RuleOption = Awaited<ReturnType<typeof listDeadlineRulesForProcedure>>[number];
  const [rules, setRules] = useState<RuleOption[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState("");
  const [triggerDate, setTriggerDate] = useState(() => formatLocalDate(new Date()));
  const selectedRule = rules.find((r) => r.id === selectedRuleId) ?? null;
  const computedDue = (() => {
    if (!selectedRule || !triggerDate) return null;
    const trigger = new Date(`${triggerDate}T00:00:00`);
    if (Number.isNaN(trigger.getTime())) return null;
    return computeDeadlineDate(trigger, selectedRule.periodValue, selectedRule.periodUnit);
  })();

  useEffect(() => {
    if (!open || !procedureId) return;
    let cancelled = false;
    setRulesLoading(true);
    listDeadlineRulesForProcedure({ procedureId })
      .then((list) => {
        if (cancelled) return;
        setRules(list);
        setSelectedRuleId((cur) => (list.some((r) => r.id === cur) ? cur : ""));
      })
      .catch(() => {
        if (!cancelled) setRules([]);
      })
      .finally(() => {
        if (!cancelled) setRulesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, procedureId]);

  function applyRule() {
    if (!selectedRule || !computedDue) return;
    const trigger = new Date(`${triggerDate}T00:00:00`);
    setValue("title", selectedRule.name, { shouldDirty: true });
    setValue("category", selectedRule.category, { shouldDirty: true });
    // El input date registra valueAsDate, la asignacion programatica necesita string yyyy-MM-dd
    // para mostrar correctamente; al enviar zod coerce.date() lo convierte a Date
    setValue("dueAt", formatLocalDate(computedDue) as unknown as Date, {
      shouldDirty: true
    });
    setValue(
      "basis",
      buildDeadlineBasis({
        legalBasis: selectedRule.legalBasis,
        triggerLabel: selectedRule.triggerLabel,
        triggerDate: trigger,
        periodValue: selectedRule.periodValue,
        periodUnit: selectedRule.periodUnit
      }),
      { shouldDirty: true }
    );
    setValue("remindDays", selectedRule.remindDays, { shouldDirty: true });
    toast.success("Plazo legal aplicado, puede ajustar manualmente", { description: HOLIDAY_NOTE });
  }

  // Al abrir se sincroniza el procedimiento seleccionado
  useEffect(() => {
    if (open) setValue("procedureId", defaultProcedureId);
  }, [open, defaultProcedureId, setValue]);

  function onSubmit(values: DeadlineCreateInput) {
    startTransition(async () => {
      try {
        await addDeadline(values);
        toast.success("Plazo agregado");
        reset();
        onOpenChange(false);
      } catch (err) {
        toast.error("Error al agregar", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Agregar plazo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
            <Field label="Procedimiento" required>
              <Select
                value={procedureId || undefined}
                onValueChange={(v) => setValue("procedureId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar procedimiento" />
                </SelectTrigger>
                <SelectContent>
                  {procedures.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {(rulesLoading || rules.length > 0) && (
              <section className="space-y-2.5 rounded-md border border-primary/25 bg-primary/[0.04] p-3">
                <div className="flex items-center gap-1.5 text-[12px] font-medium text-foreground/85">
                  <Scale className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
                  Generar por plazo legal
                  {rulesLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Regla de plazo legal</Label>
                  <Select value={selectedRuleId || undefined} onValueChange={setSelectedRuleId}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Seleccionar plazo legal aplicable" />
                    </SelectTrigger>
                    <SelectContent>
                      {rules.map((rule) => (
                        <SelectItem key={rule.id} value={rule.id}>
                          {rule.name} · {periodLabel(rule.periodValue, rule.periodUnit)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedRule && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        {selectedRule.triggerLabel}
                      </Label>
                      <Input
                        type="date"
                        value={triggerDate}
                        onChange={(e) => setTriggerDate(e.target.value)}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-1 text-[11px] leading-5 text-muted-foreground">
                      <p>
                        {selectedRule.legalBasis}
                        {selectedRule.legalBasisUrl && (
                          <a
                            href={selectedRule.legalBasisUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-1 inline-flex items-center gap-0.5 text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Ver norma
                          </a>
                        )}
                        {selectedRule.verifiedAt && (
                          <span className="ml-1.5 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-700">
                            Verificado {formatLocalDate(new Date(selectedRule.verifiedAt))}
                          </span>
                        )}
                      </p>
                      {selectedRule.description && <p>{selectedRule.description}</p>}
                      {computedDue && (
                        <p className="font-medium text-foreground/85">
                          Fecha de vencimiento:
                          <span className="font-mono tabular">
                            {formatLocalDate(computedDue)}
                          </span>
                          <span className="ml-1.5 font-normal text-muted-foreground">
                            ({HOLIDAY_NOTE})
                          </span>
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={applyRule}
                      disabled={!computedDue}
                      className="h-7 px-2.5 text-[11px]"
                    >
                      Completar formulario
                    </Button>
                  </>
                )}
              </section>
            )}

            <Field label="Nombre del plazo" required error={errors.title?.message}>
              <Input
                placeholder="Ej: Vencimiento de prueba / Vencimiento de apelacion"
                {...register("title")}
              />
            </Field>

            <Field label="Tipo de plazo">
              <Select
                value={category}
                onValueChange={(v) =>
                  setValue("category", v as DeadlineCreateInput["category"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(deadlineCategoryLabel).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Fecha de vencimiento" required>
              <Input type="date" {...register("dueAt", { valueAsDate: true })} />
            </Field>

            <Field label="Base de calculo">
              <Input
                placeholder="Ej: Notificacion de sentencia 2026-05-01 + 15 dias"
                {...register("basis")}
              />
            </Field>

            <Field label="Recordatorio previo (dias)">
              <Input
                type="number"
                min={0}
                max={60}
                className="font-mono tabular"
                {...register("remindDays", { valueAsNumber: true })}
              />
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
              Agregar plazo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
// ============ AddHearingDialog ============

export function AddHearingDialog({
  open,
  onOpenChange,
  procedures,
  defaultProcedureId,
  hearingCounts,
  proceduresDetail
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  procedures: { id: string; label: string }[];
  defaultProcedureId: string;
  hearingCounts?: Record<string, number>;
  /** Informacion adicional de cada procedimiento (organismo, sala, etc.) para precompletar */
  proceduresDetail?: Record<string, { handlingAgency?: string | null; panel?: string | null; jurisdiction?: string | null }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [ocrLoading, setOcrLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm<HearingCreateInput>({
    resolver: zodResolver(hearingCreateSchema),
    defaultValues: {
      procedureId: defaultProcedureId,
      title: "",
      startsAt: new Date(),
      endsAt: undefined,
      room: "",
      address: "",
      judge: "",
      contact: "",
      notes: ""
    }
  });

  const hearingProcedureId = useWatch({ control, name: "procedureId" });

  const autoTitle = useCallback((procId: string) => {
    const proc = procedures.find(p => p.id === procId);
    if (!proc) return;
    const count = (hearingCounts?.[procId] ?? 0) + 1;
    const numStr = CN_NUM[count] ?? String(count);
    setValue("title", `${proc.label} audiencia N° ${numStr}`);
  }, [hearingCounts, procedures, setValue]);

  // Al abrir se sincroniza el procedimiento y se genera el titulo automatico
  useEffect(() => {
    if (!open) return;
    setValue("procedureId", defaultProcedureId);
    autoTitle(defaultProcedureId);
  }, [open, defaultProcedureId, setValue, autoTitle]);

  function handleSummonsUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      try {
        const result = await parseSummons(fd);
        if (result.hearingDate && result.hearingTime) {
          const dt = `${result.hearingDate}T${result.hearingTime}`;
          setValue("startsAt", new Date(dt));
        } else if (result.hearingDate) {
          setValue("startsAt", new Date(`${result.hearingDate}T09:00`));
        }
        if (result.courtRoom) setValue("room", result.courtRoom);
        if (result.judge) setValue("judge", result.judge);
        if (result.caseNumber || result.parties) {
          const parts: string[] = [];
          if (result.caseNumber) parts.push(`Expediente: ${result.caseNumber}`);
          if (result.parties?.length) parts.push(`Partes: ${result.parties.join(", ")}`);
          setValue("notes", parts.join("\n"));
        }
        toast.success("Cedula reconocida, verifique la informacion");
      } catch (err) {
        toast.error("Error al reconocer cedula", {
          description: err instanceof Error ? err.message : "Complete manualmente"
        });
      } finally {
        setOcrLoading(false);
        // Limpiar input para poder seleccionar el mismo archivo
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  }

  function onSubmit(values: HearingCreateInput) {
    startTransition(async () => {
      try {
        await addHearing(values);
        toast.success("Audiencia agregada");
        reset();
        onOpenChange(false);
      } catch (err) {
        toast.error("Error al agregar", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Agregar audiencia</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
            {/* Subir cedula */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={handleSummonsUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={ocrLoading}
                onClick={() => fileInputRef.current?.click()}
              >
                {ocrLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ScanText className="h-3.5 w-3.5" />
                )}
                {ocrLoading ? "Reconociendo..." : "Subir cedula para reconocer"}
              </Button>
              <span className="text-[11px] text-muted-foreground">
                Suba la foto de la cedula, la IA completa automaticamente
              </span>
            </div>

            <Field label="Titulo" required error={errors.title?.message}>
              <Input placeholder="Ej: Primera audiencia" {...register("title")} />
            </Field>

            {/* Procedimiento + Organismo */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Procedimiento" required>
                <Select
                  value={hearingProcedureId || undefined}
                  onValueChange={(v) => {
                    setValue("procedureId", v);
                    autoTitle(v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar procedimiento" />
                  </SelectTrigger>
                  <SelectContent>
                    {procedures.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Organismo">
                <Input
                  readOnly
                  value={proceduresDetail?.[hearingProcedureId]?.handlingAgency ?? "—"}
                  className="bg-muted/50 text-muted-foreground"
                />
              </Field>
            </div>

            {/* Fecha y sala */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha y hora" required>
                <Input
                  type="datetime-local"
                  {...register("startsAt", { valueAsDate: true })}
                />
              </Field>
              <Field label="Sala">
                <Input placeholder="Ej: Sala 3" {...register("room")} />
              </Field>
            </div>

            {/* Juez y contacto */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Juez / Arbitro">
                <Input {...register("judge")} />
              </Field>
              <Field label="Contacto">
                <Input placeholder="Telefono del juzgado" {...register("contact")} />
              </Field>
            </div>

            <Field label="Direccion">
              <Input placeholder="Ej: Calle X 123, Ciudad" {...register("address")} />
            </Field>

            <Field label="Observaciones">
              <Textarea rows={4} {...register("notes")} />
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
              Agregar audiencia
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============ Campo compartido ============

function Field({
  label,
  required,
  error,
  children
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1 text-xs">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}