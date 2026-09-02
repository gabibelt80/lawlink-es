import type { MatterCategory, ProcedureType, LitigationStanding } from "@prisma/client";

/**
 * Tipos de procedimiento disponibles para cada categoría de caso.
 * En la UI, «Nuevo caso» y «Agregar procedimiento» filtran los ítems disponibles según esta tabla.
 */
export const proceduresByCategory: Record<MatterCategory, ProcedureType[]> = {
  CIVIL_COMMERCIAL: [
    "FIRST_INSTANCE",
    "SECOND_INSTANCE",
    "RETRIAL_REVIEW",
    "RETRIAL",
    "REMAND_FIRST",
    "REMAND_SECOND",
    "COMMERCIAL_ARBITRATION",
    "LABOR_ARBITRATION",
    "ARBITRATION_SET_ASIDE",
    "ARBITRATION_ENFORCEMENT_REVIEW",
    "ENFORCEMENT",
    "ENFORCEMENT_OBJECTION",
    "PROSECUTORIAL_SUPERVISION",
    "CUSTOM"
  ],
  CRIMINAL: [
    "INVESTIGATION",
    "PROSECUTION_REVIEW",
    "FIRST_INSTANCE",
    "SECOND_INSTANCE",
    "DEATH_PENALTY_REVIEW",
    "RETRIAL_REVIEW",
    "RETRIAL",
    "CRIMINAL_ENFORCEMENT",
    "COMMUTATION_PAROLE_REVIEW",
    "PROSECUTORIAL_SUPERVISION",
    "CUSTOM"
  ],
  ADMINISTRATIVE: [
    "ADMIN_RECONSIDERATION",
    "FIRST_INSTANCE",
    "SECOND_INSTANCE",
    "RETRIAL_REVIEW",
    "RETRIAL",
    "ADMIN_NON_LITIGATION_ENFORCEMENT",
    "PROSECUTORIAL_SUPERVISION",
    "CUSTOM"
  ],
  // El arbitraje laboral es previo; si no se acepta el laudo, se puede continuar con primera/segunda instancia/nuevo juicio/ejecución
  LABOR_ARBITRATION: [
    "LABOR_ARBITRATION",
    "FIRST_INSTANCE",
    "SECOND_INSTANCE",
    "RETRIAL_REVIEW",
    "RETRIAL",
    "ENFORCEMENT",
    "CUSTOM"
  ],
  // El arbitraje comercial es definitivo, pero después del laudo aún se puede entrar a anulación, revisión de no ejecución, ejecución, etc.
  COMMERCIAL_ARBITRATION: [
    "COMMERCIAL_ARBITRATION",
    "ARBITRATION_SET_ASIDE",
    "ARBITRATION_ENFORCEMENT_REVIEW",
    "ENFORCEMENT",
    "ENFORCEMENT_OBJECTION",
    "CUSTOM"
  ],
  NON_LITIGATION: ["NON_LITIGATION_PHASE", "CUSTOM"],
  LEGAL_COUNSEL: ["NON_LITIGATION_PHASE", "CUSTOM"],
  SPECIAL_PROJECT: ["NON_LITIGATION_PHASE", "CUSTOM"]
};

/**
 * Posiciones procesales disponibles para cada categoría de caso (nuestro rol).
 */
export const standingsByCategory: Record<MatterCategory, LitigationStanding[]> = {
  CIVIL_COMMERCIAL: [
    "PLAINTIFF",
    "DEFENDANT",
    "THIRD_PARTY",
    "ARBITRATION_CLAIMANT",
    "ARBITRATION_RESPONDENT"
  ],
  CRIMINAL: [
    "CRIMINAL_DEFENDANT",
    "CRIMINAL_VICTIM",
    "PRIVATE_PROSECUTOR",
    "CRIMINAL_INCIDENTAL_PLAINTIFF"
  ],
  ADMINISTRATIVE: ["PLAINTIFF", "DEFENDANT", "THIRD_PARTY"],
  LABOR_ARBITRATION: [
    "ARBITRATION_CLAIMANT",
    "ARBITRATION_RESPONDENT",
    "PLAINTIFF",
    "DEFENDANT",
    "THIRD_PARTY"
  ],
  COMMERCIAL_ARBITRATION: ["ARBITRATION_CLAIMANT", "ARBITRATION_RESPONDENT", "THIRD_PARTY"],
  NON_LITIGATION: ["NON_LITIGATION_PARTY"],
  LEGAL_COUNSEL: ["NON_LITIGATION_PARTY"],
  SPECIAL_PROJECT: ["NON_LITIGATION_PARTY"]
};

/**
 * Texto de sugerencia del «órgano de gestión» según el tipo de procedimiento.
 */
export function suggestHandlingAgency(type: ProcedureType): string {
  if (type === "INVESTIGATION") return "Policía / Comisión de Supervisión / Seguridad Nacional";
  if (type === "PROSECUTION_REVIEW") return "Fiscalía (departamento de revisión de acusación)";
  if (type === "PROSECUTORIAL_SUPERVISION") return "Fiscalía";
  if (type === "CRIMINAL_ENFORCEMENT") return "Prisión / Centro de detención / Institución de corrección comunitaria";
  if (type === "COMMUTATION_PAROLE_REVIEW") return "Tribunal (sala de ejecución)";
  if (type === "ADMIN_RECONSIDERATION") return "Órgano de reconsideración";
  if (type === "COMMERCIAL_ARBITRATION") return "Comisión de arbitraje";
  if (type === "LABOR_ARBITRATION") return "Comisión de arbitraje laboral";
  if (type === "ARBITRATION_SET_ASIDE" || type === "ARBITRATION_ENFORCEMENT_REVIEW")
    return "Tribunal intermedio";
  if (type === "ENFORCEMENT" || type === "ENFORCEMENT_OBJECTION") return "Tribunal (oficina de ejecución)";
  if (type === "ADMIN_NON_LITIGATION_ENFORCEMENT") return "Tribunal";
  // Primera instancia / segunda instancia / nuevo juicio, etc., tipo judicial
  return "Tribunal";
}

export const matterCategoryCode: Record<MatterCategory, string> = {
  CIVIL_COMMERCIAL: "CC",
  LABOR_ARBITRATION: "LA",
  COMMERCIAL_ARBITRATION: "CA",
  CRIMINAL: "CR",
  ADMINISTRATIVE: "AD",
  NON_LITIGATION: "NL",
  LEGAL_COUNSEL: "GC",
  SPECIAL_PROJECT: "SP"
};