import type { MatterCategory, ProcedureType } from "@prisma/client";

export type CauseScope = {
  dbCategory: MatterCategory;
  includeCodePrefixes: readonly string[] | null;
  excludeCodePrefixes: readonly string[];
};

// Ley de Arbitraje Comercial Argentina (adaptado)
// Según el Código Civil y Comercial de la Nación y la Ley de Arbitraje 27.449
// Son arbitrables: conflictos sobre derechos disponibles, contratos, sociedades, propiedad intelectual, etc.
// No son arbitrables: cuestiones de estado civil, familia, consumo, defensa del consumidor, derecho penal, administrativo sancionador, etc.
export const ARGENTINA_COMMERCIAL_ARBITRATION_INCLUDE_PREFIXES = [
  "CC-3", // Derechos reales
  "CC-4", // Obligaciones y contratos
  "CC-5", // Propiedad intelectual
  "CC-6", // Daños y responsabilidad civil
  "CC-8", // Sociedades y empresas
  "CC-9" // Seguros, títulos valores, garantías
] as const;

export const ARGENTINA_COMMERCIAL_ARBITRATION_EXCLUDE_PREFIXES = [
  "CC-3-7-65-3", // Derecho de familia / herencias
  "CC-8-22-224", // Accidentes de trabajo / indemnizaciones laborales (competencia exclusiva de la Justicia Laboral)
  "CC-8-22-236", // Conflictos de consumo (competencia exclusiva de la Justicia de Consumo)
  "CC-8-22-237", // Daños ambientales (competencia exclusiva de la Justicia Ambiental)
  "CC-9-24-315", // Disolución de sociedades (competencia exclusiva de la Justicia Comercial)
  "CC-9-26-325", // Cooperativas (competencia exclusiva de la Justicia Comercial)
  "CC-9-26-326", // Liquidación de cooperativas
  "CC-9-27" // Quiebras y concursos
] as const;

export function isCommercialArbitrationSelection(
  category: MatterCategory,
  procedureType?: ProcedureType | null
) {
  return category === "COMMERCIAL_ARBITRATION" || procedureType === "COMMERCIAL_ARBITRATION";
}

export function causeScopeForSelection(
  category: MatterCategory,
  procedureType?: ProcedureType | null
): CauseScope {
  if (isCommercialArbitrationSelection(category, procedureType)) {
    return {
      dbCategory: "CIVIL_COMMERCIAL",
      includeCodePrefixes: ARGENTINA_COMMERCIAL_ARBITRATION_INCLUDE_PREFIXES,
      excludeCodePrefixes: ARGENTINA_COMMERCIAL_ARBITRATION_EXCLUDE_PREFIXES
    };
  }

  if (category === "LABOR_ARBITRATION") {
    return {
      dbCategory: "CIVIL_COMMERCIAL",
      includeCodePrefixes: ["CC-7"],
      excludeCodePrefixes: []
    };
  }

  return { dbCategory: category, includeCodePrefixes: null, excludeCodePrefixes: [] };
}

export function causeCodeMatchesPrefix(code: string, prefix: string) {
  return code === prefix || code.startsWith(`${prefix}-`);
}

export function isCauseAllowedForSelection(
  cause: { category: MatterCategory; code: string | null; active?: boolean | null },
  category: MatterCategory,
  procedureType?: ProcedureType | null
) {
  const scope = causeScopeForSelection(category, procedureType);
  if (cause.category !== scope.dbCategory) return false;
  if (cause.active === false) return false;

  if (scope.includeCodePrefixes) {
    if (!cause.code) return false;
    if (!scope.includeCodePrefixes.some((prefix) => causeCodeMatchesPrefix(cause.code!, prefix))) {
      return false;
    }
  }

  if (cause.code && scope.excludeCodePrefixes.some((prefix) => causeCodeMatchesPrefix(cause.code!, prefix))) {
    return false;
  }

  return true;
}