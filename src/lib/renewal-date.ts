/**
 * Calcula la próxima fecha de renovación.
 * Si el día actual no existe en el mes siguiente (ej: 31 → mes con 30),
 * se usa el último día del mes siguiente.
 */
export function calculateNextRenewalDate(fromDate: Date): Date {
  const dayOfMonth = fromDate.getDate();
  const lastDayOfNextMonth = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth() + 2,
    0
  ).getDate();

  let renewalDay = Math.min(dayOfMonth, lastDayOfNextMonth);

  const renewalDate = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth() + 1,
    renewalDay
  );
  
  return renewalDate;
}
