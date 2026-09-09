/**
 * Formatea montos en pesos argentinos (ARS)
 * 
 * Formato: $1.234.567,89
 * - Separador de miles: . (punto)
 * - Separador decimal: , (coma)
 */

export function formatARS(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "$0,00";
  
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "$0,00";

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formatea montos en pesos argentinos sin decimales si son enteros
 * Formato: $1.234.567 (sin decimales)
 */
export function formatARSWhole(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "$0";
  
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "$0";

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}
