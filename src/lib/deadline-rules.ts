/**
 * v0.49 CÃ¡lculo de plazos procesales (adaptado a Argentina)
 *
 * Base legal: CÃ³digo Procesal Civil y Comercial de la NaciÃ³n (Ley 17.454)
 * - Los plazos se computan en dÃ­as hÃ¡biles (no se cuentan los feriados ni sÃ¡bados y domingos)
 * - El plazo comienza a correr al dÃ­a siguiente de la notificaciÃ³n o del hecho que lo genera
 * - Los plazos que vencen en dÃ­a inhÃ¡bil se prorrogan al dÃ­a hÃ¡bil siguiente
 * - Los plazos se cuentan por dÃ­as corridos o hÃ¡biles segÃºn lo disponga la ley
 *
 * Esta implementaciÃ³n calcula fechas de vencimiento de plazos procesales.
 * NOTA: Esta versiÃ³n NO incluye feriados automÃ¡ticos (se deben verificar manualmente).
 */
import type { DeadlinePeriodUnit } from "@prisma/client";

export const HOLIDAY_NOTE =
  "Si el vencimiento cae en feriado o dÃ­a inhÃ¡bil, se prorroga al dÃ­a hÃ¡bil siguiente. Verificar con el calendario judicial correspondiente.";

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
    throw new Error("El valor del plazo debe ser un nÃºmero entero positivo");
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
    periodUnit === "DAYS" ? "dÃ­as" : periodUnit === "MONTHS" ? "meses" : "aÃ±os";
  return `${periodValue} ${unit}`;
}

/** Formato yyyy-MM-dd en hora local */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Generar texto de fundamento del plazo: fundamento legal + cÃ¡lculo + advertencia de prÃ³rroga */
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
  ].join("ï¼›");
}
