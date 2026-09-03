import type { MatterCategory, ProcedureType, LitigationStanding } from "@prisma/client";

/**
 * Tipos de procedimiento disponibles para cada categorÃ­a de caso.
 * En la UI, Â«Nuevo casoÂ» y Â«Agregar procedimientoÂ» filtran los Ã­tems disponibles segÃºn esta tabla.
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
  // El arbitraje laboral es previo; si no se acepta el laudo, se puede continuar con primera/segunda instancia/nuevo juicio/ejecuciÃ³n
  LABOR_ARBITRATION: [
    "LABOR_ARBITRATION",
    "FIRST_INSTANCE",
    "SECOND_INSTANCE",
    "RETRIAL_REVIEW",
    "RETRIAL",
    "ENFORCEMENT",
    "CUSTOM"
  ],
  // El arbitraje comercial es definitivo, pero despuÃ©s del laudo aÃºn se puede entrar a anulaciÃ³n, revisiÃ³n de no ejecuciÃ³n, ejecuciÃ³n, etc.
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
 * Posiciones procesales disponibles para cada categorÃ­a de caso (nuestro rol).
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
 * Texto de sugerencia del Â«Ã³rgano de gestiÃ³nÂ» segÃºn el tipo de procedimiento.
 */
export function suggestHandlingAgency(type: ProcedureType): string {
  if (type === "INVESTIGATION") return "PolicÃ­a / ComisiÃ³n de SupervisiÃ³n / Seguridad Nacional";
  if (type === "PROSECUTION_REVIEW") return "FiscalÃ­a (departamento de revisiÃ³n de acusaciÃ³n)";
  if (type === "PROSECUTORIAL_SUPERVISION") return "FiscalÃ­a";
  if (type === "CRIMINAL_ENFORCEMENT") return "PrisiÃ³n / Centro de detenciÃ³n / InstituciÃ³n de correcciÃ³n comunitaria";
  if (type === "COMMUTATION_PAROLE_REVIEW") return "Tribunal (sala de ejecuciÃ³n)";
  if (type === "ADMIN_RECONSIDERATION") return "Ã“rgano de reconsideraciÃ³n";
  if (type === "COMMERCIAL_ARBITRATION") return "ComisiÃ³n de arbitraje";
  if (type === "LABOR_ARBITRATION") return "ComisiÃ³n de arbitraje laboral";
  if (type === "ARBITRATION_SET_ASIDE" || type === "ARBITRATION_ENFORCEMENT_REVIEW")
    return "Tribunal intermedio";
  if (type === "ENFORCEMENT" || type === "ENFORCEMENT_OBJECTION") return "Tribunal (oficina de ejecuciÃ³n)";
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
