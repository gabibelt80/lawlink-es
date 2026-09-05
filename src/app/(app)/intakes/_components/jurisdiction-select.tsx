"use client";

import { MapPin, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  provinces,
  citiesOf,
  areasOf,
  joinJurisdiction,
  parseJurisdiction,
} from "@/lib/china-regions";
import { cn } from "@/lib/utils";

/**
 * Selección en cascada de jurisdicción (provincia / ciudad / distrito). value es la ruta «provincia/ciudad/distrito».
 * El distrito puede no seleccionarse (solo hasta ciudad). Al seleccionar se escribe de vuelta en value.
 */
export function JurisdictionSelect({
  value,
  onChange,
  triggerClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  triggerClassName?: string;
}) {
  const { province, city, area } = parseJurisdiction(value);
  const cities = province ? citiesOf(province) : [];
  const areas = province && city ? areasOf(province, city) : [];

  const display = value ? value.replace(/\//g, " / ") : "";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-10 w-full justify-between rounded-sm font-normal",
            triggerClassName,
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 opacity-50" />
            {display ? (
              <span className="truncate">{display}</span>
            ) : (
              <span className="text-muted-foreground">
                Seleccionar jurisdicción
              </span>
            )}
          </span>
          <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        portalled={false}
        className="w-64 space-y-2 p-2"
      >
        <Field label="Provincia / Municipio">
          <Select
            value={province}
            onValueChange={(v) => onChange(joinJurisdiction(v))}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Seleccionar provincia / municipio" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {provinces.map((p) => (
                <SelectItem key={p} value={p} className="text-xs">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Ciudad">
          <Select
            value={city}
            onValueChange={(v) => onChange(joinJurisdiction(province, v))}
            disabled={!province}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={province ? "Seleccionar ciudad" : "Primero seleccioná la provincia"} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {cities.map((c) => (
                <SelectItem key={c} value={c} className="text-xs">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Distrito / Condado (opcional)">
          <Select
            value={area}
            onValueChange={(v) => onChange(joinJurisdiction(province, city, v))}
            disabled={!city || areas.length === 0}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={city ? "Seleccionar distrito / condado" : "Primero seleccioná la ciudad"} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {areas.map((a) => (
                <SelectItem key={a} value={a} className="text-xs">
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="w-full rounded-sm border border-border py-1 text-[11px] text-muted-foreground hover:bg-muted"
          >
            Limpiar
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}