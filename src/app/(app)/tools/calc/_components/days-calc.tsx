"use client";

import { useState } from "react";
import { CalendarDays, ArrowRight, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioChips } from "@/components/ui/radio-chips";
import { daysBetween, addDays } from "@/lib/legal-calc";

function fmtDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type Mode = "between" | "add";

export function DaysCalc() {
  const [mode, setMode] = useState<Mode>("between");

  // Modo 1: entre dos fechas
  const today = new Date();
  const [dateA, setDateA] = useState(fmtDate(today));
  const [dateB, setDateB] = useState(fmtDate(today));
  const [excludeWeekend, setExcludeWeekend] = useState(false);

  const [between, setBetween] = useState<number | null>(null);
  function computeBetween() {
    const a = new Date(dateA);
    const b = new Date(dateB);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) {
      setBetween(null);
      return;
    }
    setBetween(daysBetween(a, b, excludeWeekend));
  }

  // Modo 2: sumar/restar dias
  const [baseDate, setBaseDate] = useState(fmtDate(today));
  const [offset, setOffset] = useState("15");
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  function computeTarget() {
    const base = new Date(baseDate);
    const n = parseInt(offset);
    if (isNaN(base.getTime()) || isNaN(n)) {
      setTargetDate(null);
      return;
    }
    setTargetDate(addDays(base, n));
  }

  return (
    <section className="ll-surface rounded-lg border border-border p-5">
      <header className="mb-4 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-primary" strokeWidth={1.8} />
        <h2 className="text-lg">Calculadora de dias</h2>
        <span className="ml-2 text-[10px] text-muted-foreground">
          Util para plazos procesales
        </span>
      </header>

      <RadioChips
        size="sm"
        items={[
          { value: "between", label: "Entre dos fechas" },
          { value: "add", label: "Sumar/restar dias" }
        ]}
        value={mode}
        onChange={(v) => setMode(v as Mode)}
      />

      {mode === "between" ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label className="text-[11px]">Fecha de inicio</Label>
              <Input
                type="date"
                value={dateA}
                onChange={(e) => setDateA(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px]">Fecha de fin</Label>
              <Input
                type="date"
                value={dateB}
                onChange={(e) => setDateB(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Checkbox
                checked={excludeWeekend}
                onCheckedChange={(v) => setExcludeWeekend(v === true)}
              />
              Solo dias habiles (excluye fines de semana, no feriados)
            </label>
            <Button onClick={computeBetween} className="h-9 gap-1.5">
              <Calculator className="h-3.5 w-3.5" />
              Calcular
            </Button>
          </div>

          {between !== null && (
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="text-[10px] tracking-wider text-muted-foreground">Dias de diferencia</div>
              <div className="mt-1 font-mono text-[26px] font-medium tabular text-primary">
                {between >= 0 ? between : `-${Math.abs(between)}`} dias
              </div>
              {between < 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">La fecha de fin es anterior a la de inicio</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label className="text-[11px]">Fecha base</Label>
              <Input
                type="date"
                value={baseDate}
                onChange={(e) => setBaseDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px]">Dias a sumar/restar (puede ser negativo)</Label>
              <Input
                type="number"
                value={offset}
                onChange={(e) => setOffset(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={computeTarget} className="h-9 gap-1.5">
              <Calculator className="h-3.5 w-3.5" />
              Calcular
            </Button>
          </div>

          {targetDate && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-4">
              <div className="text-center">
                <div className="text-[10px] tracking-wider text-muted-foreground">Fecha base</div>
                <div className="mt-1 font-mono text-[14px] tabular text-foreground">
                  {baseDate}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="text-center">
                <div className="text-[10px] tracking-wider text-muted-foreground">
                  Fecha objetivo ({parseInt(offset) >= 0 ? "+" : ""}{offset} dias)
                </div>
                <div className="mt-1 font-mono text-[20px] font-medium tabular text-primary">
                  {fmtDate(targetDate)}
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"][targetDate.getDay()]}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}