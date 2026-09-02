/**
 * v0.49 Cálculo de plazos procesales (adaptado a Argentina)
 *
 * Base legal: Código Procesal Civil y Comercial de la Nación (Ley 17.454)
 * - Los plazos se computan en días hábiles (no se cuentan los feriados ni sábados y domingos)
 * - El plazo comienza a correr al día siguiente de la notificación o del hecho que lo genera
 * - Los plazos que vencen en día inhábil se prorrogan al día hábil siguiente
 * - Los plazos se cuentan por días corridos o hábiles según lo disponga la ley
 *
 * Esta implementación calcula fechas de vencimiento de plazos procesales.
 * NOTA: Esta versión NO incluye feriados automáticos (se deben verificar manualmente).
 */
import type { DeadlinePeriodUnit } from "@prisma/client";

export const HOLIDAY_NOTE =
  "Si el vencimiento cae en feriado o día inhábil, se prorroga al día hábil siguiente. Verificar con el calendario judicial correspondiente.";

/** Eliminar la hora y normalizar a las 00:00 de la fecha local */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const out = startOfDay(date);
  out.setDate(out.getDate() + days);
  return out;
}

function addMonthsClamped(date: Date, months: number): Date {
  const base = startOfDay(date);
  const targetMonthFirst = new Date(
    base.getFullYear(),
    base.getMonth() + months,
    1,
  );
  const lastDayOfTargetMonth = new Date(
    targetMonthFirst.getFullYear(),
    targetMonthFirst.getMonth() + 1,
    0,
  ).getDate();
  return new Date(
    targetMonthFirst.getFullYear(),
    targetMonthFirst.getMonth(),
    Math.min(base.getDate(), lastDayOfTargetMonth),
  );
}

export function computeDeadlineDate(
  triggerDate: Date,
  periodValue: number,
  periodUnit: DeadlinePeriodUnit,
): Date {
  if (!Number.isInteger(periodValue) || periodValue <= 0) {
    throw new Error("El valor del plazo debe ser un número entero positivo");
  }
  switch (periodUnit) {
    case "DAYS":
      return addDays(triggerDate, periodValue);
    case "MONTHS":
      return addMonthsClamped(triggerDate, periodValue);
    case "YEARS":
      return addMonthsClamped(triggerDate, periodValue * 12);
  }
}

export function periodLabel(
  periodValue: number,
  periodUnit: DeadlinePeriodUnit,
): string {
  const unit =
    periodUnit === "DAYS" ? "días" : periodUnit === "MONTHS" ? "meses" : "años";
  return `${periodValue} ${unit}`;
}

/** Formato yyyy-MM-dd en hora local */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Generar texto de fundamento del plazo: fundamento legal + cálculo + advertencia de prórroga */
export function buildDeadlineBasis(input: {
  legalBasis: string;
  triggerLabel: string;
  triggerDate: Date;
  periodValue: number;
  periodUnit: DeadlinePeriodUnit;
}): string {
  return [
    input.legalBasis,
    `Desde ${input.triggerLabel} (${formatLocalDate(input.triggerDate)}) plazo de ${periodLabel(input.periodValue, input.periodUnit)}`,
    HOLIDAY_NOTE,
  ].join("；");
}