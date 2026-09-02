"use client";

import { useState, useTransition } from "react";
import { Loader2, Gavel, Clock, FileDigit } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioChips } from "@/components/ui/radio-chips";
import {
  backfillCaseNumberFromSms,
  generateHearingFromSms,
  generateDeadlineFromSms,
} from "@/server/sms/actions";
import type { SmsRow, MatterOption, ParsedJson } from "./sms-types";
import { toDate } from "@/lib/sms-parser";
import { procedureTypeLabel } from "@/lib/enums";

// v0.51: Selección predeterminada de procedimiento: prioriza el procedimiento cuyo número de caso coincide con el número analizado del SMS
function preferredProcedureId(
  procedures: NonNullable<SmsRow["matchedMatter"]>["procedures"],
  parsed: ParsedJson,
) {
  const hit = procedures.find(
    (p) => p.caseNumber && parsed.caseNumbers.includes(p.caseNumber),
  );
  return hit?.id ?? procedures[0]?.id ?? "";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Generar Audiencia
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function GenerateHearingDialog({
  open,
  onOpenChange,
  sms,
  matter,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sms: SmsRow;
  matter: NonNullable<SmsRow["matchedMatter"]>;
}) {
  const parsed = sms.parsedJson as unknown as ParsedJson;
  const [procedureId, setProcedureId] = useState(
    preferredProcedureId(matter.procedures, parsed),
  );
  const [title, setTitle] = useState("Audiencia");
  const initDate = parsed.hearingDate ? toDate(parsed.hearingDate) : null;
  const [dateStr, setDateStr] = useState(initDate ? formatLocal(initDate) : "");
  const [room, setRoom] = useState(parsed.courtRoom ?? "");
  const [judge, setJudge] = useState(parsed.judge ?? "");
  const [notes, setNotes] = useState(parsed.summary);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!procedureId) {
      toast.error("Seleccioná un procedimiento");
      return;
    }
    const d = dateStr ? new Date(dateStr) : null;
    if (!d || isNaN(d.getTime())) {
      toast.error("Ingresá una hora de audiencia válida");
      return;
    }
    startTransition(async () => {
      try {
        await generateHearingFromSms({
          smsId: sms.id,
          procedureId,
          title: title.trim() || "Audiencia",
          startsAt: d,
          room: room.trim(),
          judge: judge.trim(),
          notes: notes.trim(),
        });
        toast.success("Se generó la audiencia y se marcó este SMS como procesado");
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[92vw] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-4 w-4 text-primary" />
            Generar audiencia · {matter.internalCode} {matter.title}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label className="text-[11px]">Procedimiento asociado *</Label>
            <RadioChips
              size="sm"
              className="mt-2"
              items={matter.procedures.map((p) => ({
                value: p.id,
                label: `${p.customLabel ?? procedureTypeLabel[p.type]}${p.caseNumber ? ` · ${p.caseNumber}` : ""}`,
              }))}
              value={procedureId}
              onChange={setProcedureId}
            />
          </div>

          <div>
            <Label className="text-[11px]">Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Audiencia / Juicio de segunda instancia / Consulta"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-[11px]">Hora de audiencia *</Label>
            <Input
              type="datetime-local"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-[11px]">Sala</Label>
            <Input
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-[11px]">Juez a cargo</Label>
            <Input
              value={judge}
              onChange={(e) => setJudge(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label className="text-[11px]">Observaciones</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 text-[12px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Generar audiencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Generar Vencimiento
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DEADLINE_CATEGORIES = [
  { value: "APPEAL", label: "Plazo de apelación" },
  { value: "EVIDENCE", label: "Plazo de prueba" },
  { value: "RESPONSE", label: "Plazo de contestación" },
  { value: "PERFORMANCE", label: "Plazo de cumplimiento" },
  { value: "ENFORCEMENT", label: "Plazo de ejecución" },
  { value: "LIMITATION", label: "Prescripción" },
  { value: "ARBITRATION_SET_ASIDE", label: "Plazo de anulación de laudo" },
  { value: "CUSTOM", label: "Otro" },
] as const;
type DeadlineCategory = (typeof DEADLINE_CATEGORIES)[number]["value"];

// v0.51: Clasificación de elementos importantes → Categoría de vencimiento (importantItems es más detallado que smsType)
const ITEM_KIND_TO_CATEGORY: Partial<Record<string, DeadlineCategory>> = {
  EVIDENCE_DEADLINE: "EVIDENCE",
  FEE_DEADLINE: "PERFORMANCE",
  APPEAL: "APPEAL",
  PERFORMANCE: "PERFORMANCE",
  ENFORCEMENT: "ENFORCEMENT",
};

function firstDeadlineItem(parsed: ParsedJson) {
  return parsed.importantItems.find(
    (item) => item.category === "DEADLINE" && ITEM_KIND_TO_CATEGORY[item.kind],
  );
}

function pickDefaultDeadlineTitle(parsed: ParsedJson): {
  title: string;
  category: DeadlineCategory;
} {
  const item = firstDeadlineItem(parsed);
  if (item) {
    return {
      title: item.title,
      category: ITEM_KIND_TO_CATEGORY[item.kind] ?? "CUSTOM",
    };
  }
  if (parsed.appealDeadline)
    return { title: `Plazo de apelación ${parsed.appealDeadline}`, category: "APPEAL" };
  if (parsed.smsType === "EVIDENCE_SUBMIT")
    return { title: "Plazo de prueba", category: "EVIDENCE" };
  if (parsed.smsType === "FEE_NOTICE")
    return { title: "Pago de costas judiciales", category: "PERFORMANCE" };
  if (parsed.smsType === "JUDGMENT_NOTICE")
    return { title: "Sentencia firme / Plazo de cumplimiento", category: "PERFORMANCE" };
  return { title: parsed.summary.slice(0, 30) || "Vencimiento", category: "CUSTOM" };
}

function pickDefaultDueDate(parsed: ParsedJson): Date | null {
  // v0.51: Prioriza la fecha incluida en los elementos importantes
  const item = firstDeadlineItem(parsed);
  if (item?.dateText) {
    const d = toDate(item.dateText);
    if (d) return d;
  }
  // Plazo de apelación: por defecto desde la fecha de sentencia + N días; si no hay fecha de sentencia queda vacío
  if (parsed.appealDeadline && parsed.judgmentDate) {
    const base = toDate(parsed.judgmentDate);
    const days = parseInt(parsed.appealDeadline);
    if (base && !isNaN(days)) {
      const d = new Date(base);
      d.setDate(d.getDate() + days);
      return d;
    }
  }
  // Otros: toma la primera fecha de dates
  for (const s of parsed.dates) {
    const d = toDate(s);
    if (d) return d;
  }
  return null;
}

export function GenerateDeadlineDialog({
  open,
  onOpenChange,
  sms,
  matter,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sms: SmsRow;
  matter: NonNullable<SmsRow["matchedMatter"]>;
}) {
  const parsed = sms.parsedJson as unknown as ParsedJson;
  const defaults = pickDefaultDeadlineTitle(parsed);
  const initDue = pickDefaultDueDate(parsed);

  const [procedureId, setProcedureId] = useState(
    preferredProcedureId(matter.procedures, parsed),
  );
  const [title, setTitle] = useState(defaults.title);
  const [category, setCategory] = useState<DeadlineCategory>(defaults.category);
  const [dateStr, setDateStr] = useState(
    initDue ? formatLocalDateOnly(initDue) : "",
  );
  const [basis, setBasis] = useState(parsed.summary.slice(0, 100));
  const [remindDays, setRemindDays] = useState(3);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!procedureId) {
      toast.error("Seleccioná un procedimiento");
      return;
    }
    const d = dateStr ? new Date(dateStr) : null;
    if (!d || isNaN(d.getTime())) {
      toast.error("Completá una fecha de vencimiento válida");
      return;
    }
    startTransition(async () => {
      try {
        await generateDeadlineFromSms({
          smsId: sms.id,
          procedureId,
          title: title.trim() || "Vencimiento",
          category,
          dueAt: d,
          basis: basis.trim(),
          remindDays,
        });
        toast.success("Se generó el vencimiento y se marcó este SMS como procesado");
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[92vw] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Generar vencimiento · {matter.internalCode} {matter.title}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label className="text-[11px]">Procedimiento asociado *</Label>
            <RadioChips
              size="sm"
              className="mt-2"
              items={matter.procedures.map((p) => ({
                value: p.id,
                label: `${p.customLabel ?? procedureTypeLabel[p.type]}${p.caseNumber ? ` · ${p.caseNumber}` : ""}`,
              }))}
              value={procedureId}
              onChange={setProcedureId}
            />
          </div>

          <div className="md:col-span-2">
            <Label className="text-[11px]">Categoría de vencimiento *</Label>
            <RadioChips
              size="sm"
              className="mt-2"
              items={DEADLINE_CATEGORIES.map((c) => ({
                value: c.value,
                label: c.label,
              }))}
              value={category}
              onChange={(v) => setCategory(v as DeadlineCategory)}
            />
          </div>

          <div className="md:col-span-2">
            <Label className="text-[11px]">Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Plazo de apelación 15 días / Plazo de prueba 30 días"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-[11px]">Fecha de vencimiento *</Label>
            <Input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-[11px]">Recordatorio anticipado (días)</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={remindDays}
              onChange={(e) =>
                setRemindDays(Math.max(1, parseInt(e.target.value) || 3))
              }
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label className="text-[11px]">Base del vencimiento</Label>
            <Textarea
              value={basis}
              onChange={(e) => setBasis(e.target.value)}
              rows={2}
              className="mt-1 text-[12px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Generar vencimiento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v0.51: Completar número de caso
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function BackfillCaseNumberDialog({
  open,
  onOpenChange,
  sms,
  matter,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sms: SmsRow;
  matter: NonNullable<SmsRow["matchedMatter"]>;
}) {
  const parsed = sms.parsedJson as unknown as ParsedJson;
  const usedNumbers = new Set(
    matter.procedures.map((p) => p.caseNumber).filter(Boolean) as string[],
  );
  const candidateNumbers = parsed.caseNumbers.filter(
    (n) => !usedNumbers.has(n),
  );
  const emptyProcedures = matter.procedures.filter((p) => !p.caseNumber);

  const [caseNumber, setCaseNumber] = useState(candidateNumbers[0] ?? "");
  const [procedureId, setProcedureId] = useState(emptyProcedures[0]?.id ?? "");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!caseNumber || !procedureId) {
      toast.error("Seleccioná el número de caso y el procedimiento destino");
      return;
    }
    startTransition(async () => {
      try {
        await backfillCaseNumberFromSms({
          smsId: sms.id,
          procedureId,
          caseNumber,
        });
        toast.success(`Número de caso completado: ${caseNumber}`);
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al completar");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDigit className="h-4 w-4 text-primary" />
            Completar número de caso · {matter.internalCode}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-[11px]">Número de caso analizado del SMS *</Label>
            <RadioChips
              size="sm"
              className="mt-2"
              items={candidateNumbers.map((n) => ({ value: n, label: n }))}
              value={caseNumber}
              onChange={setCaseNumber}
            />
          </div>
          <div>
            <Label className="text-[11px]">
              Completar en procedimiento (solo se listan los que no tienen número de caso) *
            </Label>
            <RadioChips
              size="sm"
              className="mt-2"
              items={emptyProcedures.map((p) => ({
                value: p.id,
                label: p.customLabel ?? procedureTypeLabel[p.type],
              }))}
              value={procedureId}
              onChange={setProcedureId}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Los procedimientos con número de caso no se pueden sobrescribir; si necesitás corregirlo, modificalo en la información del procedimiento del detalle del caso.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={pending || !caseNumber || !procedureId}
          >
            {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Completar número
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function formatLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function formatLocalDateOnly(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Hace visible el tipo MatterCombobox en este módulo (re-exportado para uso en inbox-view)
export type { MatterOption };