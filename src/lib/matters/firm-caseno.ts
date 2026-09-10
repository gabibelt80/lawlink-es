export interface CaseNoTokens {
  year: number;
  firmShortName: string;
  categoryAbbr: string;
  categoryWord: string;
  seq: number;
}

/**
 * Reemplaza los placeholders del template de número interno del estudio.
 * 
 * Placeholders soportados:
 *   {año}          → 2026
 *   {año2}         → 26
 *   {est}          → abreviatura del estudio (ej: "J")
 *   {palabraCat}   → palabra de la categoría (ej: "Civil")
 *   {sec}          → número secuencial (sin padding)
 *   {sec3}         → número secuencial con padding a 3 dígitos (001)
 *   {sec4}         → número secuencial con padding a 4 dígitos (0001)
 */
export function renderCaseNoTemplate(template: string, t: CaseNoTokens): string {
  return template
    .replace(/\{año2\}/g, String(t.year).slice(-2))
    .replace(/\{año\}/g, String(t.year))
    .replace(/\{est\}/g, t.firmShortName || "LL")
    .replace(/\{palabraCat\}/g, t.categoryWord)
    .replace(/\{sec4\}/g, String(t.seq).padStart(4, "0"))
    .replace(/\{sec3\}/g, String(t.seq).padStart(3, "0"))
    .replace(/\{sec\}/g, String(t.seq));
}
