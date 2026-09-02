"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { PreservationType, PropertyType } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  createPreservationCase,
  addTarget,
  addProperty,
  renewProperty,
} from "@/server/preservations/actions-v2";
import {
  PRES_TYPE_CN,
  PROPERTY_TYPE_CN,
  type PreservationCaseRow,
  type MatterOption,
  type UserOption,
} from "./preservation-types";
import {
  addDays,
  defaultDurationDays,
  defaultExpiryDate,
} from "@/lib/preservation-defaults";

// ── Case Dialog (create + edit) ──

export function PreservationCaseDialog({
  open,
  onOpenChange,
  editCase,
  matters,
  users,
  initialMatterId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editCase?: PreservationCaseRow;
  matters: MatterOption[];
  users: UserOption[];
  initialMatterId?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const isEdit = !!editCase;

  const [matterId, setMatterId] = useState(
    editCase?.matterId ?? initialMatterId ?? "",
  );
  const [type, setType] = useState<PreservationType>(
    editCase?.type ?? "LITIGATION",
  );
  const [court, setCourt] = useState(editCase?.court ?? "");
  const [rulingNumber, setRulingNumber] = useState(
    editCase?.rulingNumber ?? "",
  );
  const [ownerId, setOwnerId] = useState(editCase?.ownerId ?? "");
  const [note, setNote] = useState(editCase?.note ?? "");
  // First target + property (create only)
  const [target, setTarget] = useState("");
  const [propertyType, setPropertyType] =
    useState<PropertyType>("BANK_DEPOSIT");
  const [propertyDetail, setPropertyDetail] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [duration, setDuration] = useState("");

  function reset() {
    if (!isEdit) {
      setMatterId("");
      setType("LITIGATION");
      setCourt("");
      setRulingNumber("");
      setOwnerId("");
      setNote("");
      setTarget("");
      setPropertyType("BANK_DEPOSIT");
      setPropertyDetail("");
      setAmount("");
      setStartDate("");
      setDuration("");
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      try {
        const sd = startDate ? new Date(startDate) : new Date();
        const custom = parseInt(duration);
        // Si no se completan los días, se usa el plazo legal (art. 485 del Código Procesal); si se completan, se usa el valor ingresado
        const ed =
          Number.isFinite(custom) && custom > 0
            ? addDays(sd, custom)
            : defaultExpiryDate(sd, propertyType);
        // Los días guardados deben ser consistentes con la fecha de vencimiento
        const dur =
          Number.isFinite(custom) && custom > 0
            ? custom
            : defaultDurationDays(sd, propertyType);

        await createPreservationCase({
          matterId: matterId === "__none__" ? null : matterId || null,
          type,
          court,
          rulingNumber,
          ownerId: ownerId === "__none__" ? null : ownerId || null,
          note,
          remindDays: [30, 15, 7, 3, 1],
          firstTarget: target,
          firstPropertyType: target ? propertyType : undefined,
          firstPropertyDetail: propertyDetail,
          firstAmount: amount ? parseFloat(amount) : null,
          firstStartDate: target ? sd : undefined,
          firstDuration: target ? dur : undefined,
          firstExpiryDate: target ? ed : undefined,
        });
        toast.success(isEdit ? "Actualizado" : "Preservación creada");
        reset();
        onOpenChange(false);
      } catch (err) {
        toast.error("Operación fallida", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar preservación" : "Nueva preservación"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Caso relacionado">
              <Select value={matterId} onValueChange={setMatterId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Seleccione caso (opcional antes del juicio)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin relación</SelectItem>
                  {matters.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.internalCode} {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tipo de preservación *">
              <Select
                value={type}
                onValueChange={(v) => setType(v as PreservationType)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRES_TYPE_CN).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tribunal de preservación">
              <Input
                value={court}
                onChange={(e) => setCourt(e.target.value)}
                className="h-9 text-xs"
              />
            </Field>
            <Field label="Número de la resolución">
              <Input
                value={rulingNumber}
                onChange={(e) => setRulingNumber(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </Field>
            <Field label="Responsable de seguimiento">
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Seleccione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin asignar</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Observaciones">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="text-xs"
            />
          </Field>

          {/* First target + property (create only) */}
          {!isEdit && (
            <div className="rounded-lg border border-dashed border-border p-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                Primera persona afectada y bien (puede agregarse más después)
              </p>
              <Field label="Persona afectada">
                <Input
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="Nombre de la persona afectada"
                  className="h-9 text-xs"
                />
              </Field>
              {target && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tipo de bien *">
                    <Select
                      value={propertyType}
                      onValueChange={(v) => {
                        setPropertyType(v as PropertyType);
                        setDuration(
                          String(
                            defaultDurationDays(
                              startDate ? new Date(startDate) : new Date(),
                              v as PropertyType,
                            ),
                          ),
                        );
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PROPERTY_TYPE_CN).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Monto de la medida">
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="h-9 text-xs font-mono"
                    />
                  </Field>
                  <Field label="Detalle del bien">
                    <Input
                      value={propertyDetail}
                      onChange={(e) => setPropertyDetail(e.target.value)}
                      placeholder="Ej.: cuenta / dirección / patente"
                      className="h-9 text-xs"
                    />
                  </Field>
                  <Field label="Fecha de vigencia">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </Field>
                  <Field label="Plazo de preservación (días)">
                    <Input
                      type="number"
                      value={
                        duration ||
                        String(
                          defaultDurationDays(
                            startDate ? new Date(startDate) : new Date(),
                            propertyType,
                          ),
                        )
                      }
                      onChange={(e) => setDuration(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                  </Field>
                </div>
              )}
            </div>
          )}
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
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Target ──

export function AddTargetDialog({
  open,
  onOpenChange,
  caseId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  caseId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");

  function handleSubmit() {
    startTransition(async () => {
      try {
        await addTarget({ caseId, name });
        toast.success("Persona afectada agregada");
        setName("");
        onOpenChange(false);
      } catch (err) {
        toast.error("Error al agregar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Agregar persona afectada</DialogTitle>
        </DialogHeader>
        <Field label="Nombre de la persona afectada *">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre"
            className="h-9 text-xs"
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !name.trim()}
            className="gap-1.5"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Property ──

export function AddPropertyDialog({
  open,
  onOpenChange,
  targetId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  targetId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [propertyType, setPropertyType] =
    useState<PropertyType>("BANK_DEPOSIT");
  const [propertyDetail, setPropertyDetail] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [duration, setDuration] = useState("");

  function handleSubmit() {
    const sd = startDate ? new Date(startDate) : new Date();
    const custom = parseInt(duration);
    // Igual que arriba: por defecto se usa el plazo legal; si se ingresan días, se usa ese valor
    const ed =
      Number.isFinite(custom) && custom > 0
        ? addDays(sd, custom)
        : defaultExpiryDate(sd, propertyType);
    const dur =
      Number.isFinite(custom) && custom > 0
        ? custom
        : defaultDurationDays(sd, propertyType);

    startTransition(async () => {
      try {
        await addProperty({
          targetId,
          propertyType,
          propertyDetail,
          amount: amount ? parseFloat(amount) : null,
          startDate: sd,
          duration: dur,
          expiryDate: ed,
        });
        toast.success("Bien agregado");
        onOpenChange(false);
      } catch (err) {
        toast.error("Error al agregar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar bien de preservación</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo de bien *">
              <Select
                value={propertyType}
                onValueChange={(v) => {
                  setPropertyType(v as PropertyType);
                  setDuration(
                    String(
                      defaultDurationDays(
                        startDate ? new Date(startDate) : new Date(),
                        v as PropertyType,
                      ),
                    ),
                  );
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROPERTY_TYPE_CN).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Monto de la medida">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </Field>
            <Field label="Detalle del bien">
              <Input
                value={propertyDetail}
                onChange={(e) => setPropertyDetail(e.target.value)}
                placeholder="Ej.: cuenta / dirección"
                className="h-9 text-xs"
              />
            </Field>
            <Field label="Fecha de vigencia">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs"
              />
            </Field>
            <Field label="Plazo de preservación (días)">
              <Input
                type="number"
                value={
                  duration ||
                  String(
                    defaultDurationDays(
                      startDate ? new Date(startDate) : new Date(),
                      propertyType,
                    ),
                  )
                }
                onChange={(e) => setDuration(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="gap-1.5"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Renew Property ──

export function RenewPropertyDialog({
  open,
  onOpenChange,
  property,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  property: { id: string; expiryDate: Date };
}) {
  const [isPending, startTransition] = useTransition();
  const [days, setDays] = useState("365");
  const [note, setNote] = useState("");

  function handleSubmit() {
    const d = parseInt(days) || 365;
    const newExpiry = new Date(property.expiryDate.getTime() + d * 86400000);
    startTransition(async () => {
      try {
        await renewProperty({
          propertyId: property.id,
          newExpiryDate: newExpiry,
          renewalDuration: d,
          note,
        });
        toast.success("Renovación exitosa");
        onOpenChange(false);
      } catch (err) {
        toast.error("Error al renovar", {
          description: err instanceof Error ? err.message : "",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Renovar</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Fecha de vencimiento actual:{" "}
            {property.expiryDate.toLocaleDateString("es-AR")}
          </p>
          <Field label="Días de renovación">
            <Input
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="h-9 text-xs font-mono"
            />
          </Field>
          <Field label="Observaciones">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-9 text-xs"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="gap-1.5"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirmar renovación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Shared ──

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px]">{label}</Label>
      {children}
    </div>
  );
}
