/**
 * Mapeo de codigos de tribunal SAIJ a categorias del gestor de casos.
 *
 * SAIJ devuelve `tipo-tribunal` como codigos de 2-3 letras (LB, CS, CI, etc.)
 * que no siguen una logica obvia. Este mapa traduce esos codigos a las
 * categorias que usa el estudio en el gestor de casos.
 *
 * Los codigos desconocidos quedan sin categoria (null).
 */

export type CategoriaMateria =
  | "Civil y Comercial"
  | "Derecho Administrativo"
  | "Empresas"
  | "Penal"
  | "Familia"
  | "Aduanero"
  | "Impositivo";

export const CATEGORIAS_VALIDAS: CategoriaMateria[] = [
  "Civil y Comercial",
  "Derecho Administrativo",
  "Empresas",
  "Penal",
  "Familia",
  "Aduanero",
  "Impositivo",
];

/**
 * Mapa de codigo SAIJ -> categoria del gestor.
 *
 * Fuentes: muestreo de busquedas SAIJ (2026-09-18).
 * Los codigos no listados devuelven null (sin categoria).
 *
 * Nota: laboral (LB, LM, TR, T1) se mapea a "Civil y Comercial" por
 * decision del usuario (2026-09-18).
 */
export const SAIJ_TRIBUNAL_MAP: Record<string, CategoriaMateria> = {
  // Civil y Comercial (incluye Laboral)
  CI: "Civil y Comercial",
  CC: "Civil y Comercial",
  CM: "Civil y Comercial",
  LB: "Civil y Comercial",
  LM: "Civil y Comercial",
  TR: "Civil y Comercial",
  T1: "Civil y Comercial",

  // Empresas (comercial, societario, concursal)
  CO: "Empresas",

  // Derecho Administrativo (contencioso administrativo)
  CA: "Derecho Administrativo",

  // Penal
  PE: "Penal",
  PN: "Penal",
  NP: "Penal",

  // Federal (CS, F5, F7, FS, JS): sin categoria especifica

  // Desconocidos (B5, G2, MT, SS, DG, CB): sin categoria
};

/**
 * Devuelve la categoria del gestor para un codigo SAIJ.
 * Si el codigo no esta mapeado, devuelve null.
 *
 * Acepta tambien strings sucios como "CI CI CI" (bug del parser viejo)
 * tomando solo el primer token.
 */
export function mapSaijTribunalToCategoria(
  codigo: string | null | undefined
): CategoriaMateria | null {
  if (!codigo) return null;
  // Tomar solo el primer token (defensa contra "CI CI CI")
  const first = codigo.trim().split(/\s+/)[0];
  if (!first) return null;
  return SAIJ_TRIBUNAL_MAP[first] ?? null;
}