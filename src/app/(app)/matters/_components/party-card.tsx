"use client";

/**
 * Fila de tabla de partes del caso (exclusivo de intake-sheet)
 *
 * Referencia al formulario de creación de caso de «Caso cloud»: una fila por parte, columnas alineadas, campos secundarios plegados.
 * Columnas: Rol | Tipo | Nombre / Razón social | Posición procesal | N° documento / código de crédito | Acciones
 * - Las columnas Rol / Posición procesal son inyectadas por el llamador (roleSlot / standingSlot), este componente no se encarga de su lógica
 * - Tipo (persona física / entidad), documento (DNI / código de crédito social unificado + búsqueda IA), expandir campos secundarios, Eliminar son responsabilidad de este componente
 * - Campos secundarios (rep. legal / teléfono / contacto / dirección / notas) plegados por defecto, hacé clic en «Más» para expandir debajo de la fila
 *
 * PARTY_GRID se usa tanto en el encabezado como en cada fila para asegurar la alineación de columnas.
 *
 * La validación está en zod superRefine (partyInputSchema); este componente solo se encarga de UI + interacción de campos.
 */
import { useRef, useState, useTransition, type ReactNode } from "react";
import { useFormContext, type FieldErrors } from "react-hook-form";
import { ChevronDown, Loader2, Search, Trash2 } from "lucide-react";
import type { PartyType } from "@prisma/client";
import { toast } from "sonner";
import { partyTypeLabel, PARTY_TYPE_OPTIONS } from "@/lib/enums";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  searchEnterpriseCandidates,
  getEnterpriseDetail,
  type EnterpriseSearchItem,
} from "@/server/yuandian/enterprise";

/** Compartido entre encabezado y cada fila para asegurar la alineación de columnas. Litigio/arbitraje incluye columna «Posición procesal» (antes de contacto). Columnas de nombre/documento son ~15% más angostas que v0 */
export const PARTY_GRID =
  "grid grid-cols-[70px_92px_minmax(136px,1fr)_minmax(160px,1.08fr)_102px_92px_112px_36px] items-center gap-1.5";
/** No contencioso/consultoría/proyectos: sin columna «Posición procesal» */
export const PARTY_GRID_NO_STANDING =
  "grid grid-cols-[70px_92px_minmax(136px,1fr)_minmax(160px,1.08fr)_92px_112px_36px] items-center gap-1.5";

const PARTY_CELL_CONTROL_CLASS =
  "h-[34px] rounded-sm border-[#c6d0dd] bg-white text-center text-[12px] placeholder:text-center";
const PARTY_CELL_SELECT_CLASS =
  "h-[34px] rounded-sm border-[#c6d0dd] bg-white px-2 text-center text-[12px] [&>span]:w-full [&>span]:text-center";

type Props = {
  index: number;
  fieldPrefix: string; // e.g. "parties"
  onRemove: () => void;
  errors?: FieldErrors<Record<string, unknown>>;
  /** Contenido de la celda de Rol (insignia de cliente / desplegable de contraparte y tercero) */
  roleSlot: ReactNode;
  /** Contenido de la celda de Posición procesal (se ignora si showStanding es false) */
  standingSlot?: ReactNode;
  /** Si se muestra la columna «Posición procesal». Litigio/arbitraje true, no contencioso/consultoría/proyectos false. Por defecto true */
  showStanding?: boolean;
  /** Si es false se oculta el botón Eliminar (por ejemplo, la fila del cliente siempre existe). Por defecto true */
  removable?: boolean;
  /** Si se proporciona, reemplaza el campo «Nombre / Razón social» integrado (por ejemplo, la fila del cliente inyecta el selector de Cliente). */
  nameSlot?: ReactNode;
};

export function PartyCard({
  index,
  fieldPrefix,
  onRemove,
  errors,
  roleSlot,
  standingSlot,
  showStanding = true,
  removable = true,
  nameSlot,
}: Props) {
  const { register, watch, setValue } = useFormContext();
  const p = `${fieldPrefix}.${index}`;
  const partyType = (watch(`${p}.partyType`) as PartyType) ?? "NATURAL_PERSON";
  const isOrg = partyType !== "NATURAL_PERSON";

  const [candidates, setCandidates] = useState<EnterpriseSearchItem[] | null>(
    null,
  );
  const [searching, startSearch] = useTransition();
  const [filling, startFill] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Si los campos secundarios ya tienen contenido (pequeño indicador en estado plegado)
  const secondaryFilled = [
    watch(`${p}.address`),
    watch(`${p}.notes`),
    isOrg ? watch(`${p}.legalRep`) : undefined,
  ].filter((v) => typeof v === "string" && v.trim() !== "").length;

  function changeType(next: PartyType) {
    setValue(`${p}.partyType`, next, {
      shouldDirty: true,
      shouldValidate: true,
    });
    // Al cambiar de tipo, limpiar los campos obligatorios del otro lado para evitar confusiones
    if (next === "NATURAL_PERSON") {
      setValue(`${p}.enterpriseSocialCode`, "");
      setValue(`${p}.enterpriseName`, "");
    } else {
      setValue(`${p}.idNumber`, "");
    }
  }

  // v0.43: Al ingresar la razón social, autocompletar con empresas de Yuandian (con debounce), sin necesidad de botón IA
  function scheduleSearch(value: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = value.trim();
    if (q.length < 2) {
      setCandidates(null);
      return;
    }
    searchTimer.current = setTimeout(() => {
      startSearch(async () => {
        try {
          const r = await searchEnterpriseCandidates(q);
          // Yuandian no configurado / sin resultados → silencio, sin molestar (el código de crédito aún se puede completar manualmente)
          setCandidates(r.configured && r.items.length > 0 ? r.items : null);
        } catch {
          setCandidates(null);
        }
      });
    }, 400);
  }

  function handlePickCandidate(item: EnterpriseSearchItem) {
    startFill(async () => {
      // Primero completar código social + razón social (ya vienen en el resultado de búsqueda)
      setValue(`${p}.enterpriseSocialCode`, item.creditCode, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue(`${p}.enterpriseName`, item.name, { shouldDirty: true });
      setValue(`${p}.name`, item.name, { shouldDirty: true });
      setCandidates(null);

      // Luego llamar a la API de detalle para obtener rep. legal + dirección (10 POINT/vez)
      try {
        const r = await getEnterpriseDetail(item.id);
        if (r.configured && r.info) {
          if (r.info.legalRep)
            setValue(`${p}.legalRep`, r.info.legalRep, { shouldDirty: true });
          if (r.info.address)
            setValue(`${p}.address`, r.info.address, { shouldDirty: true });
          setExpanded(true); // Expandir para que el usuario verifique el rep. legal / dirección completados
          toast.success(`Se rellenó: ${item.name}`);
        }
      } catch (err) {
        // El error de detalle no bloquea, el código social ya completado sigue siendo válido
        toast.warning(
          "La autocompletación de representante legal / dirección falló; podés completarlo manualmente",
          {
            description: err instanceof Error ? err.message : "",
          },
        );
      }
    });
  }

  const fieldErr = (errors as any)?.[fieldPrefix]?.[index] ?? {};
  const nameErr = fieldErr.name;
  const idErr =
    partyType === "NATURAL_PERSON"
      ? fieldErr.idNumber
      : fieldErr.enterpriseSocialCode;
  const nameReg = register(`${p}.name`);

  const grid = showStanding ? PARTY_GRID : PARTY_GRID_NO_STANDING;

  return (
    <div className="rounded-md border border-[#cbd5e2] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-input">
      <div className={cn(grid, "px-2 py-1.5")}>
        {/* Rol */}
        <div className="min-w-0 text-center">{roleSlot}</div>

        {/* Tipo de sujeto */}
        <Select
          value={partyType}
          onValueChange={(v) => changeType(v as PartyType)}
        >
          <SelectTrigger className={PARTY_CELL_SELECT_CLASS}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PARTY_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t} value={t} className="text-xs">
                {partyTypeLabel[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Nombre / Razón social (tipo entidad: al escribir se autocompleta con empresas de Yuandian) */}
        <div className="min-w-0">
          {nameSlot ??
            (!isOrg ? (
              <Input
                className={cn(
                  PARTY_CELL_CONTROL_CLASS,
                  nameErr && "border-destructive",
                )}
                placeholder="Nombre y apellido"
                {...register(`${p}.name`)}
              />
            ) : (
              <Popover
                open={!!candidates && candidates.length > 0}
                onOpenChange={(o) => {
                  if (!o) setCandidates(null);
                }}
              >
                <PopoverTrigger asChild>
                  <div className="relative">
                    <Input
                      className={cn(
                        PARTY_CELL_CONTROL_CLASS,
                        "pr-7",
                        nameErr && "border-destructive",
                      )}
                      placeholder="Nombre de la entidad / organización (se completa automáticamente al escribir)"
                      {...nameReg}
                      onChange={(e) => {
                        nameReg.onChange(e);
                        scheduleSearch(e.target.value);
                      }}
                    />
                    {searching && (
                      <Loader2 className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  portalled={false}
                  className="w-72 p-1.5"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="mb-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
                    <Search className="h-3 w-3" />
                    Coincidencia Yuandian, clic para completar nombre + código de crédito
                  </div>
                  <ul className="max-h-64 space-y-1 overflow-y-auto">
                    {candidates?.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => handlePickCandidate(c)}
                          disabled={filling}
                          className="w-full rounded border border-border bg-background px-2 py-1.5 text-left text-xs transition-colors hover:border-input hover:bg-muted hover:text-foreground disabled:opacity-50"
                        >
                          <div className="font-medium">{c.name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {c.creditCode}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </PopoverContent>
              </Popover>
            ))}
        </div>

        {/* N° documento / código de crédito (se completa tras la coincidencia, también manual) */}
        <div className="min-w-0">
          {!isOrg ? (
            <Input
              placeholder="DNI (obligatorio)"
              className={cn(
                PARTY_CELL_CONTROL_CLASS,
                "font-mono",
                idErr && "border-destructive",
              )}
              {...register(`${p}.idNumber`)}
            />
          ) : (
            <Input
              placeholder="Código de crédito social unificado (obligatorio)"
              className={cn(
                PARTY_CELL_CONTROL_CLASS,
                "font-mono",
                idErr && "border-destructive",
              )}
              {...register(`${p}.enterpriseSocialCode`)}
            />
          )}
        </div>

        {/* Posición procesal (solo litigio/arbitraje) — movida antes de contacto */}
        {showStanding && <div className="min-w-0">{standingSlot}</div>}

        {/* Contacto */}
        <Input
          className={PARTY_CELL_CONTROL_CLASS}
          placeholder="Contacto"
          {...register(`${p}.contactName`)}
        />

        {/* Teléfono */}
        <Input
          className={cn(PARTY_CELL_CONTROL_CLASS, "font-mono")}
          placeholder="Teléfono"
          {...register(`${p}.phone`)}
        />

        {/* Acciones: Más + Eliminar */}
        <div className="flex items-center justify-end gap-0.5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={
              expanded ? "Contraer" : "Más (rep. legal / dirección / notas)"
            }
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              !expanded && secondaryFilled > 0 && "text-primary",
            )}
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                expanded && "rotate-180",
              )}
            />
          </button>
          {removable && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-7 w-7 shrink-0 rounded-sm p-0 text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Errores de campos obligatorios (visible incluso plegado) */}
      {(nameErr || idErr) && (
        <p className="px-2 pb-1.5 text-[10px] text-destructive">
          {[nameErr?.message, idErr?.message].filter(Boolean).join("; ")}
        </p>
      )}

      {/* Campos secundarios (expandido) */}
      {expanded && (
        <div className="grid grid-cols-1 gap-2 border-t border-[#cbd5e2] bg-[#e9eef5] px-2 py-2 sm:grid-cols-2">
          {isOrg && (
            <Input
              className="h-[34px] rounded-sm border-[#c6d0dd] bg-white text-[12.5px]"
              placeholder="Representante legal / responsable (opcional)"
              {...register(`${p}.legalRep`)}
            />
          )}
          <div className="sm:col-span-2">
            <Input
              className="h-[34px] rounded-sm border-[#c6d0dd] bg-white text-[12.5px]"
              placeholder={isOrg ? "Domicilio registrado (opcional)" : "Domicilio (opcional)"}
              {...register(`${p}.address`)}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              className="h-[34px] rounded-sm border-[#c6d0dd] bg-white text-[12.5px]"
              placeholder="Notas (opcional)"
              {...register(`${p}.notes`)}
            />
          </div>
        </div>
      )}
    </div>
  );
}